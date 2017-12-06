// This script is used to change the url for solution submission attachments so the routes can be
// moved behind authentication

// NOTE: This needs to match the path in the config files
var desiredPath = '/private/files/solution-submissions';

db.getCollection('registrations').find({}).forEach(function(doc){
  //printjson(doc.otherDocuments);
  doc.otherDocuments.forEach(function(attachment){
    var splitPath = attachment.path.split('/');
    attachment.path = splitPath[splitPath.length-1];
    attachment.path = desiredPath + '/' + attachment.path;
    //print(attachment.path);  
    db.registrations.save(doc);
  });
  if(doc.whitepaper){
    var splitPath = doc.whitepaper.path.split('/');
    doc.whitepaper.path = splitPath[splitPath.length-1];
    doc.whitepaper.path = desiredPath + '/' + doc.whitepaper.path;
    //print(doc.whitepaper.path);  
    db.registrations.save(doc);
  };
});