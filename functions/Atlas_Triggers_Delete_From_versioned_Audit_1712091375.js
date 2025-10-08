//Delete_From_versioned_Audit written April 2 2024 by Ron Paro

exports = async function() {
    const collection = context.services.get("VMDM-DEVCluster").db("vmdm-versioned-Audit").collection("entity"); 
     
     // Get the current date
const currentDate = new Date();

// Calculate the date 180 days ago
const daysToMilliseconds = 24 * 60 * 60 * 1000; // Conversion factor from days to milliseconds
const millisecondsIn180Days = 180 * daysToMilliseconds;
const date180DaysAgo = new Date(currentDate.getTime() - millisecondsIn180Days);

console.log("Date 180 days ago:", date180DaysAgo);

    const query = { dateTimePublished: { $lt: date180DaysAgo } };
    
    // Log the count of documents to delete
    const countToDelete = await collection.count(query);
    console.log(`Count of documents to delete: ${countToDelete}`);
    
    if (countToDelete > 0) {
      // Loop through the array and check for another document with the same stepID.  If the count is > 1, then go ahead and delete the one that is more than 180 days old.
      const documents = await collection.find(query).toArray();

      var counter = 0;
      for (const document of documents) {
       var checkForBaseline = 0;
        const stepID = document.stepID;
        const query2 = { stepID: stepID};
           
            checkForBaseline = await collection.count(query2);
           console.log(`checkForBaseline: ${checkForBaseline}`);
           console.log(`stepID: ${stepID}`);
        if(checkForBaseline > 1){
        await collection.deleteOne({ _id: document._id });
        counter = counter + 1;
        }
      }
    
      console.log(`Deleted ${counter} documents.`);
    } else {
      console.log("No documents to delete.");
    }
};
