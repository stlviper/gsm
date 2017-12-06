// Prints out user data in csv format for importing into mailchimp
// Users added after the date provided in the dateAdded field are returned
db.getCollection('accounts').aggregate([
  {
    $match:{
      dateAdded: {$gte: new ISODate("2016-05-252T00:00:00Z")}
    }
  },
  {
    $lookup:{
      "from":"organizations",
      "localField":"orgRef",
      "foreignField":"_id",
      "as":"organization"
    }
  },
  {
    $unwind: "$organization"
  }
]).forEach(function(doc){
  print("\"" + doc.email + "\",\"" + doc.firstName + "\",\"" + doc.lastName + "\",\"" + doc.organization.orgName+"\"")
})