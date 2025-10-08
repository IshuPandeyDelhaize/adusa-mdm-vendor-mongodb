/* This is a UTILITY function to remove documents that are dulicates fron the same day in the vmdm-versioned-Audit database


*/

exports = async function() {

  const tempCollection = context.services.get("VMDM-DEVCluster").db("vmdm-versioned-Audit").collection("temp"); 
  const entityCollection = context.services.get("VMDM-PROD").db("vmdm-versioned-Audit").collection("entity");
  
  // Find the document in the 'temp' collection
  const tempDoc = await tempCollection.findOne({});
  
  if (!tempDoc || !tempDoc.list || tempDoc.list.length === 0) {
    console.log("No document found in 'temp' collection or 'list' field is empty.");
    return;
  }
  // Extract the list of values
  const rows = tempDoc.list.split("\n").filter(row => row.trim() !== "");
  
  var count = 0;
  
  // Loop through the rows and extract stepID and Maintenance_Date
  for (let row of rows) {
    try {
      const [stepID, Maintenance_Date] = row.split(",");
      
      // Use stepID and Maintenance_Date as search criteria for the entity collection
      const query = {
        stepID: stepID.trim(),
        Maintenance_Date: Maintenance_Date.trim()
      };
      
      // Perform a query to find documents in the entity collection
  //     const result = await entityCollection.findOne(query);
  //     console.log(`Found ${result._id} document in 'entity' collection for stepID: ${stepID} and Maintenance_Date: ${Maintenance_Date}`);
             await entityCollection.deleteOne(query);

      count = count +1;
    } catch (error) {
      console.error(`Error processing row "${row}": ${error.message}`);
    }
  }
     console.log(`Document count:`,count);
   await tempCollection.deleteMany({});

};