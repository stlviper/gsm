//=============================================================================
// Purpose:
//  This is to be ran first when moving to the default fields as custom fields.
//  It adds the new custom fields to represent the old schema fields
//=============================================================================

db.getCollection('challenges').find({}, {"customRegistrationFields": 1}).forEach(function (challengeDoc) {
  print("Processing Challenge: " + challengeDoc._id);

  var pocName = {
    "_id": ObjectId(),
    "label": "POC Name",
    "field_type": "text",
    "required": true,
    "field_options": {
      "size": "large",
      "maxlength": 10,
      "min_max_length_units": "words",
      "options": []
    }
  };

  var pocEmail = {
    "_id": ObjectId(),
    "label": "POC Email",
    "field_type": "email",
    "required": true,
    "field_options": {
      "size": "large",
      "options": []
    }
  };

  var description = {
    "_id": ObjectId(),
    "label": "Description",
    "field_type": "paragraph",
    "required": true,
    "field_options": {
      "size": "large",
      "options": []
    }
  };

  var newCustomFields = challengeDoc.customRegistrationFields;
  if (newCustomFields && newCustomFields.length > 0) {
    newCustomFields.unshift(pocName, pocEmail, description);
  }
  else {
    newCustomFields = [pocName, pocEmail, description];
  }
  var query = {_id: challengeDoc._id},
    action = {$set: {'customRegistrationFields': newCustomFields}};

  db.challenges.update(query, action, function(err){
    if(error){ print('oh no')}
  });
});