# Objects

Inside the core, most things are represented by objects. There are not objects in the standard OOP way. From a Saffire userland perspective, we talk about classes and instances instead of classes and objects so not to be confused between core objects and userland objects.

An object is nothing more than a `struct _object` structure which is heavily modelled on Python. This structure can be found in `include/objects/object.h`.

A `t_object` has by default just a header and a footer. It's imperative to use the macro defines for this `SAFFIRE_OBJECT_HEADER` and `SAFFIRE_OBJECT_FOOTER`. This is because these macro's can depend on the way saffire is compiled (with or without debug information for instance).

## The object header
The header consists of the following:

    long ref_count;
    t_objectype_enum type;          
    char *name;
    int flags; 
    t_object *class;
    t_object *parent;
    t_dll *interfaces;              
    t_hash_table *attributes;       
    t_object_funcs *funcs;          
    int data_size;
    struct _vm_stackframe *frame;  
    
<dl>
  <dt>long ref_count;</dt>
  <dd>The number of variables that refer to this object. This also counts if the object is placed on the VM stack. If 0, it means that no variables within Saffire userland refers to this object, and it could be garbage collected to free up memory.</dd>
  <dt>t_objectype_enum type;</dt>
  <dd>The type of the given object. Based on the type, there can be additional information within the object's structure</dd>
  <dt>char *name;</dt>
  <dd>The name of the object (ie: "string", "numerical", "boolean", "regex", "user", "base")</dd>
  <dt>int flags;</dt>
  <dd>Object flags (see below)</dd>
  <dt>t_object *class;</dt>
  <dd>If the object is an instance, this value will point to the actual class. For instance, a string instance will always point to the actual string class object.</dd>
  <dt>t_object *parent;</dt>
  <dd>If the class extends another class, it will point to the parent CLASS object.</dd>
  <dt>t_dll *interfaces;</dt>
  <dd>A doubly linked list of all interface objects that this object inherits</dd>
  <dt>t_hash_table *attributes; </dt>
  <dd>A hashtable of all attributes within the object (properties, constants and methods)</dd>
  <dt>t_object_funcs *funcs;</dt>
  <dd>A function table with housekeeping functions, could be NULL, or any of the housekeeping functions could be zero.</dd>
  <dt>int data_size;</dt>
  <dd>The size of the data within the structure. For instance, a numerical object keeps a additional long value that represents its value, thus the data_size of a numerical object is 8 (long, could be 4 on smaller platforms)</dd>
  <dt>struct _vm_stackframe *frame;</dt>
  <dd>The stackframe in which the (userland) class or instance has been initialized. Will be null for core objects and is only relevant for userland classes.</dd>
</dl>  

### Object  flags###
The object flags is a bitmask of the following constants:

    #define OBJECT_TYPE_CLASS         1            /* Object is a class */
    #define OBJECT_TYPE_INTERFACE     2            /* Object is an interface */
    #define OBJECT_TYPE_ABSTRACT      4            /* Object is an abstract class */
    #define OBJECT_TYPE_INSTANCE      8            /* Object is an instance */
    #define OBJECT_TYPE_MASK         15            /* Object type bitmask */

    #define OBJECT_TYPE_USERLAND   4096            /* Object is a userland generated class */

    #define OBJECT_FLAG_IMMUTABLE     16           /* Object is immutable */
    #define OBJECT_FLAG_ALLOCATED     32           /* Object can be freed, as it is allocated through alloc() */
    #define OBJECT_FLAG_FINAL         64           /* Object is finalized */
    #define OBJECT_FLAG_MASK         112           /* Object flag bitmask */

Some settings are mutually exclusive: for instance, an object cannot be a class (1) and an instance (8) at the same time. It can be a abstract class (4) and a class (1) at the same time.

Classes and the corresponding instances always have the `OBJECT_TYPE_USERLAND` bit set. Some objects are immutable, which can be used to make sure that nothing can change any properties of the object. The `OBJECT_FLAG_ALLOCATED` means that the object can be freed. This is not always the case, as some core objects (both classes and instance) are created with the source (for instance, all core classes, and the boolean instance `true` and the boolean instance `false`). The garbage collector must never free these values, as they are not allocated to begin with (to be honest, it should be done better as they should be initialized with a refcount 1, so it will never ever reach refcount 0 and thus will never be attempted to be freed).

## The object footer
Depending wether or not Saffire is compiled with debug info, the footer looks like this:

    char __debug_info_available;
    char __debug_info[DEBUG_INFO_SIZE];

Without debug information, it looks like this:

    char __debug_info_available;

Note the missing `__debug_info` field. When `__debug_info_available` is set to 1, it means that the field is available, otherwise, it is not (and reading/writing to it result in garbage). The reason the footer is present is to have a more generic way to print debug information about an object (for instance, `"numerical(0)"`, `"boolean(false)"` `"User[myclass]"`, `"hash(5 elements)"` etc. We placed this at the end, so t_objects compiled without debug do not have this information and still can decently reference everything else.


## Core objects
Saffire defines some core objects. These objects are mostly saffire userland classes, but some of them are also instances. For instance, the boolean class exist, but also the boolean instance `true`, the boolean instance `false`, and the `null` interface (there is no `null` class).

It's not possible to extend the `boolean` class, as it is internally declared final, and it does not have a `__ctor`, so it cannot be initialized.

- attrib

  Represents an attribute object. This is purely an internal core object and cannot be used within saffire userland.
  
- base

  A base class on which every single class is based on (ultimately). It contains functionality that is available in all classes (like `__refcount()`, `__id()`, `__methods()`, etc. 
  
- boolean

  A boolean class and the `true` and `false` instances.
  
- callable

  Mostly a core object, but could be potentially used outside in userland as well. Represent something that can be called. This could also be internal code. For instance, all core objects have methods that are defined as callables with internal code. This way, we can generically work and even mix core functionaly written in C, and userland code and even extend core classes like "string" with additional functionality.
  
- exception
  
  A base exception class.
  
- hash
  A representation of a hash-table
  
- list
  A representation of a doubly linked list
  
- null
  A generic null instance (not a class).
  
- numerical
  A numerical class that represents a numerical value (integers only)
  
- regex
  A regular expression class
  
- string
  A string object holds a string value, a length, a unicode (utf8) representation and a locale. This way, you can even mix locales togehter (order a list of german strings, and a list of spanish strings, which have different ordering)
  
- tuple
  A linked list of values that cannot be mutated after creation.
  
  
### Object funtions

    typedef struct _object_funcs {
        void (*populate)(t_object *, t_dll *);      // Populates an object with new values
        void (*free)(t_object *);                   // Frees objects internal data and places it onto gc queue
        void (*destroy)(t_object *);                // Destroys object. Don't use object after this call!
        t_object *(*clone)(t_object *);             // Clone this object to a new object
        t_object *(*cache)(t_object *, t_dll *);    // Returns a cached object or NULL when no cached object is found
        char *(*hash)(t_object *);                  // Returns a string hash (prob md5) of the object
        char *(*debug)(t_object *);                 // Return debug string (value and info)
    } t_object_funcs;
    
`populate()` populates a given object (which is an instance) with the given arguments as found in the DLL. This is NOT the constructor though, but it mostly used for creating instances from within the core. From the userland, populate will not be used, but simply the `__ctor()` method will be called which will set values on the properties. The `__populate` is the way to set values in the internal data structure of classes. 

`free()` is used to free up any internal data. For instance, the string object will free the unicode, locale and string values.

`destroy()` will actually destroy (free if possible) the given object and cannot be used or references afterwards.

`clone()` is the internal core way to duplicate the given object. It will mostly clone the internal data structure.

`cache()` is a way to quickly create an object from a cache. For instance, there could be a list of the 100 last generated string objects that are still available in memory. When a new instance is generated, the `cache()` function could check the cache and return a match. This way, it does not have call `__populate` in order to populate a new object but can reuse old ones.
It is used a lot for numerical values, where the first 256 numericals are pre-instantiated as these values are quite commonly used.

`hash()` returns a hash of an object, mostly for matching purposes.

`debug()` is only available when compiled with debug information. Since this information is used in many different context, it will actually generate the debug string within the object (in the `__debug_info` found in the object footer) and return its address.

Its possible that the function entry table, or even a specific function is set to NULL.





## Initializing the core objects
All the core objects are initialized through `object_init()` method as found in `src/components/objects/object.c`.

It will call each of the core functions, starting with attrib_object, because it is needed for generating callable objects, which in turn are needed to create every other object. It's imperative that attrib objects do not have any callables (methods, basically), as those are not initialized at that point.

Initialization of an object is a two-way system. The first step is to define the actual structure (for instance, `t_string_object Object_String_struct` in the `src/components/objects/string.c` file. This uses a macro called `OBJECT_HEAD_INIT()` to initialize the t_object data structure. 

However, a string object is not a `t_object`, but a `t_string_object`, has more data fields. However, it's imperative that it is defined with a `SAFFIRE_OBJECT_HEADER` at the start, and a `SAFFIRE_OBJECT_FOOTER` at the end. You can see this happen in `include/objects/string.h`: 

    typedef struct {
        t_string *value;            // string value
        md5_byte_t hash[16];        // (MD5) hash of the actual string
        int needs_hashing;          // 1 : string needs hashing, 0 : hash done

        int iter;                   // Simple iteration index on the characters
        char *locale;               // Locale
    } t_string_object_data;

    typedef struct {
        SAFFIRE_OBJECT_HEADER
        t_string_object_data data;
        SAFFIRE_OBJECT_FOOTER
    } t_string_object;
    
    
The `t_string_object_data` structure is the specific data for string objects.
Because a t_object, t_string_object, even a t_callabe_object and t_numerical_object all start with the `SAFFIRE_OBJECT_HEADER`, we can easily cast every saffire object to a generic `t_object`, provided we only use the fields in the header (otherwise the compiler would complain anyway). This makes it possible to do things like this:


    t_object *returnsomething() {
      t_string_object *obj = create_string_object_from_text("hello world");
      return (t_object *)obj;
    }
    
We can return any type of object now, in this case, a string object. This object could for instance be pushed on the virtual machine stack, and popped later on by another vm opcode.

It's up to the user of an t_object to check if the object actually is a specific t_object it can work with, and cast it accordingly:

    void increaseValue(t_object *object) {
       if (object->type != objectTypeNumerical) {
         return;
       }
       
       t_numerical_object *num = (t_numerical_object *)object;
       num->value++;
    } 
    
You will see (A LOT) of casting to and from `t_object *` in the code. Most of the time, we do not really care about the type of the object, just the fact that it is an object is sufficient. A bit of OO inside a non-oo language like C.



Back to the initialization:

We use the `OBJECT_HEAD_INIT` macro or one of the others: `OBJECT_HEAD_INIT_WITH_BASECLASS` if we want to initialize a class that uses something else as the `Base` object as a  parent. It's just a simple way to not typing the data for a whole whole structure. It will set the refcount to 0, set the class to NULL, setup your object functions (if supplied), set the name (if supplied) etc. 

The only thing that is does not do, is setup any interfaces and attributes. This is done inside the init() method of each object (thus the `object_string_init()`, `object_numerical_init()` etc.

Here, it will create a new hash-table at `Object_String_struct.attributes`. Then it will call the `object_add_internal_method` for each method with the structure, the name of the method, flags and such and finally the actual internal method that represents this method. They normally have something in the form of `object_string_method_ctor` and `object_string_method_upper`, because we use macros again for defining these functions (they all must use a certain signature header).

The `object_add_internal_method()` can be found in `object.c` and is quite easy: it creates a callable object to the actual code (with the given flags), it creates an attribute object and links the callable to it. And finally it adds that attribute to the attributes hashtable of the object.

Adding constants or properties to core classes work the same way, except it uses the `object_add_constant()` and `object_add_property` functions instead.

One thing to realize is that when adding interfaces, you must implement all methods of these interfaces manually, AND add the actual interface with `object_add_interface`. There is no check to see if you have implmented all method for the interface, except when instantiating the class.


## defining internal methods

Internal methods from objects should have the following signature

      SAFFIRE_METHOD(string, length)
      
where `string` is the object, and `length` the method name. It will be expanded to something like:

    static t_object * object_string_method_length ( t_string_object *self, t_dll *arguments)
    
This is why inside the `object_string_init()` we use can use `object_string_method_length`, although maybe a macro define should come in handy in case we want to change the name of the methods.

Each call will get two arguments: the actual string object (we always know it's a string object that will be passed so we can safely use `t_string_object`, and a dll of arguments. There are no named arguments, we only work with the zero, first, second etc element from the DLL as the arguments.


### Parsing object arguments in internal methods
We can use the arguments easily though (based on PHP parameter parsing):

    SAFFIRE_METHOD(string, split) {
       t_string_object *token_obj;
       t_numerical_object *max_obj;

       if (! object_parse_arguments(SAFFIRE_METHOD_ARGS, "s|n", &token_obj, &max_obj)) {
           return NULL;
       }
       
The `object_parse_arguments` takes the given arguments (specified by the SAFFIRE_METHOD_ARGS define, but really expand into `arguments`, a signature on what to expect, and the pointers where to store the arguments. In the example, the first argument MUST be a string, and if there is a second argument (optionally), it must be a numerical value. If it does not comply to this the function will raise an exception and we should return NULL (indicating no value has returned, and the vm should check for exceptions).

There are few format characters that can be used:

`n`   Numerical value
`N`   Null
`s`   String
`r`   Regex
`b`   Boolean
`o`   Any object
`|`   Anything after this mark are optional arguments (but still must comply to the rules)


So 

	object_parse_arguments(SAFFIRE_METHOD_ARGS, "sbo|nN", ...
	
accepts at least three arguments (a string, a boolean and any object in that order), and optionally a fourth numerical, and optionally a fifth NULL value.



## Instantiating classes (from userland)

Some classes can be easily instantiated, like the `hash` class:

     a = hash();
     a->add('foo', 'bar');
     
Same goes for strings:

     a = string("hello world");
     
But there are other ways:

     a = "hello world";  // Implies a string object
     b = hash[["foo" : "bar" ]];  // Implies hash datastructure

These are taken care of by the bytecode (when a constant string is found in the bytecode, it will automatically generate a string instance from it, same with numbers). And datastructure are handled through the VM.


The `__ctor()` is the constructor method, and is called whenever you "call" a class. For instance,

    a = MyClass("foo", "bar");
    
will call the `__ctor()` method from the `MyClass` class, with the arguments "foo" and "bar". If `MyClass` does not have a `__ctor()` method, the parent `__ctor()` will be called, until it reaches the `Base` class, which has a dummy `__ctor()` method. 




## Reference count
Reference count is a easy way to keep track on which objects are in use, and which aren't. As soon as an objects gets assigned to a variable, the reference count is increased with one. If it gets unset from that  variable the reference count will be decreased with one. Also, when an object gets pushed onto the VM stack, the refcount increases, when popped, it decreases again.

As soon as the refcount hits zero, we know that no more variables are using this object, and it can be safely removed (it works with all type of objects, instances and classes, although classes are not really released due to the fact that they are attached to the frame, which gives them a refcount of at least 1.

It works well, except when there are cyclic references:  A points to B, B points to C, C points to A. Now, if there are no references to A, B and C, these objects still reference eachother in a cycle. Saffire will not be able to free the memory as their refcounts are not zero. This "cyclic" reference check is something that is not yet implemented (which should live inside the garbage collector system). There are many different algorithms available for this kind of work.