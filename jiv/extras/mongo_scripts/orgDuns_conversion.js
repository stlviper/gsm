//

db.organizations.find({},{_id:true, orgDuns:true}).forEach(function(org){
  printjson(org);
  if (org.orgDuns) {
    db.organizations.update(
      {_id: org._id},
      {$set:
        {orgId: {name:"orgInternalId", value:org.orgDuns},
        orgType: "Industry"
        }
      }
    );

    db.challenges.find({orgDuns: org.orgDuns}, {_id:true}).forEach(function(id){
      printjson(id);
      db.challenges.update(
        {_id: id._id},
        {$set: {orgRef: org._id}}
      );
    });

    db.products.find({orgDuns: org.orgDuns}, {_id:true}).forEach(function(id){
      printjson(id);
      db.products.update(
        {_id: id._id},
        {$set: {orgRef: org._id}}
      );
    });

    db.accounts.find({orgDuns: org.orgDuns}, {_id:true}).forEach(function(id){
      printjson(id);
      db.accounts.update(
        {_id: id._id},
        {$set: {orgRef: org._id}}
      );
    });
  }
});


