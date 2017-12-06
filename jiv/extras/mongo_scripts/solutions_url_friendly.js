db.getCollection('products').find({}, {"name": 1}).forEach(function(doc){
  var originalName = doc.name;
  var URLName = '';
  print ("Product: " + originalName);

  // convert spaces to '-'
  URLName = originalName.replace(/ /g, "-");
  // Make lowercase
  URLName = URLName.toLowerCase();
  // Remove characters that are not alphanumeric or a '-'
  URLName = URLName.replace(/[^a-z0-9-]/g, "");
  // Combine multiple dashes (i.e., '---') into one dash '-'.
  URLName = URLName.replace(/[-]+/g, "-");

  print ("URL Friendly: " + URLName + '\n');

  doc.urlFriendlyID = URLName;

  db.products.update(
    {_id: doc._id},
    {$set: {urlFriendlyID: URLName}}
  );

});