var Annotation = require('../src/annotate');

var annotate = new Annotation();
annotate.serialize(function() {
    if (false) {
        annotate.prepareTable();
        annotate.addNote('/a/b/1', 'Hello World');
        annotate.addNote('/a/c', 'This is cool!');
        annotate.getNote('/a/c');
    }
    else {
        annotate.browse();
    }
});
annotate.close();

//annotate.close();
