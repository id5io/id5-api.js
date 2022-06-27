let testsContext = require.context('./spec', true, /.spec$/);
testsContext.keys().forEach(testsContext);
