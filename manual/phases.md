## Phases
Saffire runs in a few different phases, where some of the phases are not yet implemented, some phases are "merged" together, and some phases should be obsoleted in the near future.

- Phase 1: Lexing tokens
- Phase 2: Parsing tokens to correspond with Saffire grammar
- Phase 3: converting AST into ASM
- Phase 4: converting ASM into bytecode
- Phase 5: execute bytecode through the Saffire Virtual Machine

## Phase 1: Lexing
The first phase of getting a Saffire userland application to run is through lexing. This is the process of converting text (a file with saffire code in it) to a long list of known tokens. For instance, if your code consists of simply `import foo;`, it will emit three tokens: `T_IMPORT` `<identifier>` and `;`. The lexer knows about keywords (like the string `import`), but also about brackets, operators etc. It knows about comments (either `/* .. */` or `//`) and strings (with single quotes or double quotes), and it knows that whenever the word `"import"` is found withing quotes, it is a string instead of the token `T_IMPORT`. However, it does not know anything about what `T_IMPORT` does. It does not know that T_IMPORT must be followed by an identifier and ended with a `;`. This is the parsers job. 

For the tokening, Saffire uses flex. And this code can be found in `/src/components/compiler/saffire.l`. There is some additional complexity in it, for instance, a `/` can have different meaning based on context. For instance, it can be used for regular expressions (`if foo ~= /fo+/`), or it can be seen as a divider operator (`a = 10 / 5;`). This is where the two different states come from named `st_div` and `st_regex`. 

There is some additional (C) code present in this file to help with lexing through the Saffire REPL system.

The `saffire.l` file will be compiled (through the flex application) into a `lex.yy.c`. This file will be compiled into Saffire and has the functionality that creates the stream of input tokens (lexemes) that the parser in the next phase can work with.

## Phase 2: Parsing
Once we have established a stream of tokens, we can actually tell Saffire what they mean, and how they should be ordered. For instance, that an import statement (starting with the `T_IMPORT` token) must be present before any other code, and that after a "switch" must come a opening parenthesis `switch a` is wrong, while `switch (a)` is correct syntax.

This parsing is done through `bison`, and is often-used in combination with `flex`. The parse-rules are defined in `src/components/compiler/saffire.y`. 

The parsing has a few purposes:

1. It will check if your Saffire code is syntaxily correct (`import foo;` would be ok, but `foo import;` not.
2. It will convert the code into an `Abstract Syntax Tree`, which makes it easier later on to work with.
3. It can do some (rudimentary) checks that are sometimes too hard to setup as real bison rules. 

   For instance, when creating the roles on function visibility, we accept all modifiers (final, public, private, abstract, static etc). But not all combinations make sense or are allowed: `final abstract` is pretty useless, so is `protected public` etc. On occasion, the bison rules will call functions like `parser_validate_flags()` and `parser_validate_property_modifiers()` that will do these checks. These functions are defined in `src/component/compiler/parser_helpers.c`.
   
   It's got many other helpfull functions like `parser_switch_default()`, which checks if you haven't added two `default` elements within a switch statement for instance. 
   
   Another important function is the `parser_write_check()` that checks if an element is writable (ie: it's a variable or a subscribt (`a[1]` or even `a[]`). This allows to quickly check if you haven't done anyhting like `4 = 6;` as you cannot store the number `6` into `4`, (but `a = 6;` would be ok, as `a` is a writable variable).


### Abstract Syntax Tree
As soon as we have defined a rule, and the tokens follow that rule, we can setup an `Abstract Syntax Tree` (`AST`). This is a tree structure that follows Saffire rules, where everything is abstracted into defined elements. For instance, when we encounter an "import" statement within the tree, we always know that that statement hase 3 children underneat, being a class, an alias and a module. With this information it makes it much easier to write a system that actually can interpret the parsed saffire code later on. An AST is simply in setup, and does not contain any unneeded information like ';', comments, comma's, parentesis etc. It's possible to generate an AST from Saffire code, but it's harder to generate Saffire code from an AST, although it is possible (but it will never be exactly the same as the original source code).

Another benefit of AST's is that you can perform all kind of tricks to them. One of them is that each node in the AST has a line number on where that node was inside the actual source code. For instance, if you had an import statement on the first line of your code, the corresponding AST import element would have line number one. If something goes wrong, for instance, when the import module could not be found, it would be easier to generate an error like: `"Error on line 1: cannot import module 'foo'"`.

It's possible within Saffire to generate an AST and graphically display it with the "`saffire compile bytecode --dot`" command. This creates a graphviz DOT file which can be converted to an image. It was used during the construction of the parser, but never removed. Do not use on very large programs, as many elements will be present in the AST, but on very small programms (10-20 lines), it's a nice overview of your code in an AST representation.

#### AST elements
Each element within the AST is a `t_ast_element`, which by itself is a large union/structure (defined in `include/saffire/compiler/ast_nodes.h`. There are a fixed number of ast elements: string, numerical, identifier, class, operator etc, each element type has it's own set of data (the string ast element has only a `char *value`, while the numerical ast element as a `int value`. More complex elements like the operator element has an `oper`, which defines which operator is used (add, sub, div, mul, shr etc), the number of operators in `nops` and a list with `nops` ast elements. 

Each ast element has some global data as found in the `t_ast_element` structure: it's `type`, `flags` (i think this property is obsolete), `lineno` the current line number in the source file for this element, and `grouping`, which, if set to 1, tells that this element is a container with other elements (so we can add elements to a group without specifiying that this can only be done to all the specific grouping separately).

Ultimately, the bison file (`saffire.y` will go over the rules, and build up the AST-tree. At the end of the parsing, a single root ast_element will be generated under which all other nodes will fall. Each bison rule will most like create a new ast element (or elements), which then gets added by bison to the tree. Creating these ast elements are done by the `ast_*` functions that can be found in `saffire.y`. These functions are located in `src/component/compiler/ast_nodes.c`.


   

## Phase 3: ASM
Once completed, the AST can be used for multiple purposes, but its main purpose is to be converted to bytecode. However, due to some serious issues (which still aren't solved), this AST->bytecode conversion does not work properly and an additional step is needed. This step is to convert the AST to assembler (ASM). This ASM format are just simple sequental lines telling what must be done.

For instance, when encountering a string AST element, it will "emit" a line similar to "`VM_LOAD_ID $1`", where `$1` is the number on where that given string is found in the bytecode. This is another reason why using an AST is easier: you can start by scanning the whole tree to find all the constant string values and numerical values, and assign them a number. For instance "foo" could become `$1`, so when the system emits `VM_LOAD_ID $1`, the virtual machine knows that it needs to load the string "foo".

This whole "walking" of the AST tree and emitting assembler lines is done in the file `src/component/compiler/ast_to_asm.c`.

But things can be a bit complex. For instance, when encountering an identifier element (like the `a` in `a = 5;`, a few things need to be known: this `a`, do we need to load the information found in `a`, or are we storing something in `a`?. In the case of `a = 5`, we are storing something into `a`. However, in `b = a`, we must load the value of `a` (and store it in `b`). So we need to keep a context that tells us if we are currently loading or storing something. This means that when emitting, it can know if it needs to emit either a `VM_LOAD_ID` or `VM_STORE_ID`.

Creating this assembler is actually pretty hard. This is deliberatly done, because it also means that the virtual machine can stay relatively simple (stupid, even). Since more time is spend in the VM than "compiling" the AST into ASM (and bytecode), it makes sense to do it this way.

As we will see later, it means that the VM does not do much. There are no while and for statements. There isn't really a "real" if-statement. It's just loading, storing and jumping that the VM does (which in fact, is what a CPU does as well!).

When the whole AST is walked, the code is completely converted into "assembler". However, this is not a textual representation yet. It is possible to create one by on the commandline by using the command: `saffire bytecode compile --text`. This will create a `.sfa` file which stands for Saffire assembly. However, saffire cannot run these files, there are only for output / experimental purposes (mostly to check the generation of bytecode and execution through the VM machine).

The actual data structure used are "frames". It starts with the "main" frame, which is the start of the application. Each method body is a seperate frame so each method is represented by its own assembler-code and supporting data (like the symbol table that keeps track on which variable and constant is which number in the code). 

## Phase 4: Bytecode
Unfortunately, we cannot generate bytecode directly, but need an intermediate step from the assembler. But, with the assembler lines, we can generate bytecode. 

There is a file called `src/components/compiler/ast_to_bytecode.c`, that optimistically is empty. It should contain the functionality to convert AST straight away.

For now, the bytecode is generated by `src/component/compiler/output/asm.c`, the `assembler()` method. This method will take the collection of frames as generated by `ast_to_asm`, and generate bytecode for it. Most of this work is actually done by `convert_frames_to_bytecode()` in the `src/component/compiler/bytecode/marshal.c` file. It will create the bytecode based on the assembler code, and the supporting data like the constants, strings and identifiers found in the given frame. Besides these elements, a line number table is stored within the bytecode. Basically it is an (efficient) lookup table that can quickly tell that when i'm in the bytecode on position 98, to which original line in the saffire source it corresponds (so this information was present in the AST, was copied over to the ASM, and is ultimately stored in the bytecode file). This allows to do: "error on line 6", even though the virtual machine found an error somewhere in the bytecode and have no idea what "line 6" actually is.

We will talk about what actually bytecode during the VM phase. For now, we have created a "compact" structure with all the information needed for the virtual machine to execute what was intended in the actual source file. Basically, as soon as the AST has been generated, the original saffire source file is never needed anymore and could be removed.

This is a feature of Saffire: it allows you to run (precompiled) bytecode files without the original source files be present. This is NOT however, a way to protect your original code, as it is possible to read a bytecode file to figure out what's going on, but it does mean that the whole process of lexing, parsing, converting to AST and ASM and bytecode can be skipped. This could drastically speed up processing! 

Once a bytecode structure has been generated, it's possible for Saffire to save this file on disk in the form of `<filename>.sfc`. It's stands for saffire compiled (code). If a corresponding sfc file is found, saffire will read that file and start executing immediately. It can detect if the sfc file is out-of-date (it stores the modification time of the saffire source file (`.sf`) inside the `.sfc` file, so when the `.sf` time is newer than the one recorded in the `.sfc` file, it means that the user has changed the saffire source code, and a new `.sfc` must be compiled.

Another benefit of using `.sfc` files is that they can be signed by a GPG key. This way, it's easy to authenticate code and to make sure that it's genuine without anyone else being able to have it modified. For instance, it's possible to sign your binary, (and maybe even to sign your source code file as well?). If the user key is trusted in your GPG keychain, it will automatically run the code (or the import). If not, it will deny it. This way, you can always assume trusted code (especially useful when dealing with third party modules and extensions)

## Phase X: the missing optimizer
Normally, we would skip the "assembler" phase, and go directly from AST to bytecode. But even with the intermediate assembler, the actual generated bytecode is still pretty stupid. It will just emit commands without checking any context. It's quite possible that the following would be emitted:

    VM_LOAD_ID $1
    VM_LOAD_ID $1

Where both statement are generated by different AST elements. In this case, (provided we cannot jump directly to the second statement through a label), we could remove the second statement, and change it into a `VM_DUP_TOP`, which creates a new reference to the last element on the stack:

	VM_LOAD_ID $1
	VM_DUP_TOP

This is much faster, as create a new reference on the stack is simply copying an address location, while an extra `VM_LOAD_ID` consist of looking up the `$1` into the symbol table, and then copying the reference. Sure, it might not be the LARGEST performance benefit ever, but a lot of small optimizations like these can result in a big performance boost.

Another example:

        VM_POP_TOP
        VM_JUMP_ABSOLUTE  @label3
    label3:
        VM_LOAD_ID $1

In this case, the `VM_JUMP_ABSOLUTE`, only jumps to the next line, which will be automatically executed anyway. Instead of executing the jump-statement, we can safely remove it:

        VM_POP_TOP
        // removed
    label3:
        VM_LOAD_ID $1

It saves a use-less jump and some VM processing time.

These kind of savings are done through a so-called peephole optimizer: a system that simply checks a small part (the peephole or window) of the code, and graduately shift the window up. Each time, it will go over a set of optimizations and sees if it can optimize things. This again, will keep the assembler/bytecode generator fairly simple without knowing too much about surrounding context, and let the optimizer still be able to optimize some of its code later on.


## Phase 5: The VM
bytecode operands
