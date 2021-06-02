let testsContext = require.context('./spec', true, /_spec$/);
testsContext.keys().forEach(testsContext);
