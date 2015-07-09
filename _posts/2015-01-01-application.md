---
title: Saffire Application
layout: post
author: Joshua Thijssen
category: Application
date: 2015-01-01 00:01:00
---

# Saffire application
The general idea of Saffire was to have a single binary that will be able to do everything that is needed: run files, serve as fastcgi, do the REPL etc.

This is why saffire has different commands, where each command corresponds to either an internal or external command.

## Internal commands
There are a few internal commands:
- saffire exec
- saffire config
- saffire fastcgi
- saffire lint
- saffire bytecode
- saffire version
- saffire help

#### Saffire help
Displays help information about Saffire in general, the found commands and possible options.

#### Saffire version
Displays current Saffire version

#### Saffire config
Gets or sets configuration options for saffire. This configuration is based on .ini files, and can be either global or local. This command even has the option to generate a default configuration for you.

#### Saffire lint
Does a lint (syntax) check on the given Saffire file.

#### Saffire fastcgi
Starts Saffire in FastCGI mode as a deamon so it can be used for nginx or other FastCGI capable webservers.

#### Saffire exec
This is the command that will run a saffire file. 

This command is also the default when no command is found on the command line. This is why `./saffire test.sf` is equal to `./saffire exec test.sf`.

(note that because of the way Saffire deals with precompiled files, it's possible that when executing `test.sf`, it really loads and executes `test.sfc` if present in the same directory and when it detects that this file is still "fresh". In fact, when running `./saffire test.sf`, you do not even have to have the `test.sf` file present in the current directory. Also, you could run `./saffire exec test.sfc` to run the sfc file (and again, when not fresh, it will fall back to `test.sf`).

#### Saffire bytecode
The bytecode command deals with some internal things that can be useful on occasion. Mostly it will display information about a bytecode file (`.sfc`) through the subcommand `info`: `./saffire bytecode info test.sfc`.

There is a `sign` and `unsign` subcommand that will sign and unsign bytecode with your key. 

And the most important subcommand is `compile`, which compiles a saffire application without actually running it. There are additional options like `--text`, which will save a `.sfa` assembler output and `--dot` which generates a representation of the AST.


## External commands
Not all commands are by default available as internal commands. It's quite possible to have external commands that are not created as C code, but still can be useful. For instance, there is (in progress) a webserver that can serve Saffire files. With this webserver it's quite easy to create a saffire web application without setting up Nginx and a FastCGI system. This webserver is completely written in Saffire itself.

External commands can be found on the command path (by default `/usr/lib/saffire/commands`), and start with `saffire-<command>`. Thus, the webserver would be available as `/usr/lib/saffire/commands/saffire-webserver`, and can be run as `./saffire webserver <webserver_options>`. Saffire will automatically detect this as an external command and load the correct file.

It's possible to not only create external commands with userland Saffire code, but even other languages, (even shell scripts) and precompiled binaries written in C.

This system is partly taken from the git ecosystem where you can easily add new features to git in pretty much the same way.

A few ideas for this could be:

* A standalone webserver (in progress)
* A package manager (`./saffire package install custom/framework`)
* Other tools that can come in handy while developping or using Saffire.
