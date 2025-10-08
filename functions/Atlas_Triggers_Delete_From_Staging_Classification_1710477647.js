//Delete_From_Staging_Classification
/** Trigger written by Ron Paro 11-27-2023
 *  This function will listen for events in the vmdm mirror BP database and delete the corresponding source document after the versioned document is written 
 */
 exports = async function(changeEvent) {


  // Get the MongoDB service you want to use (see "Linked Data Sources" tab)

  const targetCollection = context.services.get("VMDM-DEVCluster").db("vmdm-staging-Context1").collection("classification");   // specify the target database and collection

  // Get the "FullDocument" present in the Insert ChangeEvents
    const versionedDocument = changeEvent.fullDocument;  
    const stepID = versionedDocument._id;
    const objectType = versionedDocument.objectTypeID;
console.log("stepID: ", stepID);
console.log("objectType: ", objectType);
  try {
        // delete the document in the other collection
      await targetCollection.deleteOne({"_id": stepID});

  } catch(err) {
    console.log("error performing mongodb write: ", err.message);
  }
};