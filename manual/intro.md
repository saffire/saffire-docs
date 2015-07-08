# Saffire
This documentation is for both myself and others to get an impression on how Saffire works internally.

## Terminology
I try to be consistent with the terminology through these readings. To make things a bit clearer, here are a few of the terms I will use regularly.

<dl>
  <dt>Core</dt>
  <dd>With the Saffire core I mean everything that is written in C. For instance, the VM is part of the core, so is the string class and the numerical class.</dd>
  <dt>Userland</dt>
  <dd>Anything that is not in the core. For instance, any class you write in Saffire code will be userland. The Saffire webserver, although bundled with Saffire, is a userland application, as it is written in Saffire.</dd>
  
  <dt>Object</dt>
  <dd>Many elements within the Saffire core are internally represented by objects. Objects in this context has got nothing to do with Object Oriented Programming. Within Saffire userland, I will try and talk about classes and instances so there is no confusing with core objects.</dd>
</dl>


- Part 1: [Saffire Phases](phases.md)
- Part 2: [Saffire Objects]
- Part 3: [Saffire Execution]
- Part 4: [Saffire VM]
