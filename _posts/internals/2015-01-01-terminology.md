---
title: Terminology
layout: post
author: Joshua Thijssen
category: internals
date: 2015-01-01 00:00:00
---

I try to be consistent with the terminology through these readings. To make things a bit clearer, here are a few of the terms I will use regularly.

### Core
With the Saffire core I mean everything that is written in C. For instance, the VM is part of the core, so is the string class and the numerical class.

  
### Userland
Anything that is not in the core. For instance, any class you write in Saffire code will be userland. The Saffire webserver, although bundled with Saffire, is a userland application, as it is written in Saffire.
  
### Object
Many elements within the Saffire core are internally represented by objects. Objects in this context has got nothing to do with Object Oriented Programming. Within Saffire userland, I will try and talk about classes and instances so there is no confusing with core objects.</dd>




