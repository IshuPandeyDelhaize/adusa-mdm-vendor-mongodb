//Delete_From_Staging_Flattened  written Feb. 15 2024 by Ron Paro
// Testing for deployment

exports = async function() {
    const collection = context.services.get("VMDM-DEVCluster").db("vmdm-staging-Context1").collection("flattened"); 
    
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    const dateTimeNow = new Date();
    const strDateTimeNow = dateTimeNow.toISOString();
    const strFiveMinAgo = fiveMinutesAgo.toISOString();
    console.log("date time now: ", strDateTimeNow);
     console.log("date time five min ago: ", strFiveMinAgo);

    const query = { dateTimePublished: { $lt: fiveMinutesAgo } };
    
    // Log the count of documents to delete
    const countToDelete = await collection.count(query);
    console.log(`Count of documents to delete: ${countToDelete}`);
    
    if (countToDelete > 0) {
      // Option 1: Loop through the array and delete each document
      const documents = await collection.find(query).toArray();
      for (const document of documents) {
        console.log(`dateTimePublished: ${document.dateTimePublished}`);
        await collection.deleteOne({ _id: document._id });
      }
    
      console.log(`Deleted ${countToDelete} documents.`);
    } else {
      console.log("No documents to delete.");
    }
};
