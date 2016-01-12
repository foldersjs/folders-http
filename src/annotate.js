
var path = require('path')
var sqlite3 = require('sqlite3').verbose();

var dbFile = path.join(__dirname, '/../db/annotation.sqlite');
console.log('dbFile: ', dbFile);
var db = new sqlite3.Database(dbFile);

/* This class is used to add annotation on a give path */
var Annotation = function() {
    var serialize = function(cb) {
        db.serialize(cb);
    }
    
    var prepareTable = function() {
        db.run("CREATE TABLE if not exists notes (ID INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT, note TEXT)", function(err) {
            if (err) {
                console.log('Create table error: ', err);
            }
        });
    }
    
    //Reset the database!
    var reset = function() {
        db.serialize( function() {
            prepareTable();
            db.run("DELETE FROM notes");    
        });
    }
    
    var addNote = function(path, note, cb) {
        //db.run("INSERT INTO notes (path, note) VALUES (?,?)", path, note, function(err) {
        
        db.run("INSERT OR REPLACE INTO notes (ID, path, note) VALUES ((SELECT ID FROM notes WHERE path = ?), ?, ?)", path, path, note, function(err) {
            if (typeof(cb)!='undefined'){
                cb(err);
            }
        })
        
    }
    
    var getNote = function(path, cb) {
        db.all("SELECT * FROM notes WHERE path=?", path, function(err, rows) {
            //console.log('found rows: ', rows.length, rows[0]);
            if (typeof(cb)!='undefined') {
                if (rows.length > 0) {
                    cb(err, rows[0].note);
                }
                else cb(null, '');  //no note defined at thsi location
            }
            
        });
    }
    
    var browse = function() {
        console.log('Existing notes:')
        
        db.each("SELECT * FROM NOTES", function(err, row) {
            //console.log('Existing notes:')
            console.log(row);
            //console.log(row.path + ': ' + row.note);
        })
    }
    
    var close = function() {
        db.close();
    }
    
    this.reset = reset;
    this.addNote = addNote;
    this.getNote = getNote;
    this.browse = browse;
    this.close = close;
    this.serialize = serialize;
    
}

module.exports = Annotation