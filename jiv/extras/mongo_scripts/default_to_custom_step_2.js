//=============================================================================
// Purpose:
//  This script is to be ran second and will migrate all the old responses to
//  to the new format. It does not remove the old values so the data is still
//  if needed but will not appear in the UI.
//=============================================================================
db.getCollection('registrations').find({}).forEach(function (regDoc) {
  db.getCollection('challenges').find({'_id': ObjectId(regDoc.challengeID)}).forEach(function (challengeDoc) {
    var existingResponses = regDoc.customFieldResponse || [];
    var name = {
      "fieldId": null,
      "response": regDoc.pocName,
      "fieldType": "text",
      "_id": ObjectId()
    };
    var email = {
      "fieldId": null,
      "response": regDoc.pocEmail,
      "fieldType": "email",
      "_id": ObjectId()
    };
    var description = {
      "fieldId": null,
      "response": regDoc.description,
      "fieldType": "paragraph",
      "_id": ObjectId()
    };
    var customFields = challengeDoc.customRegistrationFields;
    for (var idx in customFields) {
      if (true) {
        var field = customFields[idx];
        if (field.label == 'POC Name') {
          name.fieldId = field._id;
        }
        else if (field.label == 'POC Email') {
          email.fieldId = field._id;
        } else if (field.label == 'Description') {
          description.fieldId = field._id;
        }
      }
    }
    existingResponses.push(name, email, description);
    var query = {'_id': regDoc.id},
      action = {$set: {'customFieldResponse': existingResponses}};
    db.registrations.update(query, action, function (err) {
      if (error) {
        print('oh no')
      }
      else{
        print('done')
      }
    });
  });
});