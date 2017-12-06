db.getCollection('organizations').find({}, {"orgName": 1}).forEach(function(orgDoc){
  var originalName = orgDoc.orgName;
  var URLName = '';
  print ("OrgName: " + originalName)

  // convert spaces to '-'
  URLName = originalName.replace(/ /g, "-");
  // Make lowercase
  URLName = URLName.toLowerCase();
  // Remove characters that are not alphanumeric or a '-'
  URLName = URLName.replace(/[^a-z0-9-]/g, "");
  // Combine multiple dashes (i.e., '---') into one dash '-'.
  URLName = URLName.replace(/[-]+/g, "-");

  print ("URL Friendly: " + URLName + '\n');

  orgDoc.urlFriendlyID = URLName;

  db.organizations.update(
    {_id: orgDoc._id},
    {$set: {urlFriendlyID: URLName}}
  );

});