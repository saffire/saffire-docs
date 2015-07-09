# Debugging

A rudimentary debugging system is available in `src/components/debugger/dbgp`. It's based on Derick Rethan's DBGP protocol, which is a language agnostic debugging protocol. However, most IDEs do not work well with custom languages. For isntance, PHPStorm, a popular IDE will not accept any other debugger connection except for specific PHP.

The only debugger currently available capable of dealing with DBGP decently is the Komodo debugger.

For more information about DBGP, see the [XDebug site](http://xdebug.com/docs-dbgp.php).


A debugging connection is made to an IDE, mostly on an IP port 9000. This connection sends over information, from the engine to the IDE with XML. The IDe sends back information as commands and argument options like `property_get -i 5 -n "$x['a b']" -d 0 -c 0 -p 0`.

The reason for this is because this way it's easier for a debugger to parse the incoming data from an IDE. The ide itself normally is already large and capabable of handling XML. A debugger isn't always able to. However, sending out XML is a lot easier than parsing it.