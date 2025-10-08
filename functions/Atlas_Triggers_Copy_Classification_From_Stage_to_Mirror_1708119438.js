// Copy_Classification_From_Stage_to_Mirror

/** Trigger written by Ron Paro 1-3-2024
 * This function will listen for documents inserted into vmdm-staging-Context1.entities collection and will do a full copy into
 * the vmdm-mirror database where they will be persisted and updated with future changes coming from the STEP VMDM application.
 */
exports = async function(changeEvent) {
function formatDateForMongo(date) {
  const isoString = date.toISOString();
  const formattedDateTime = isoString.slice(0, 16); // Extract the first 16 characters (YYYY-MM-DDTHH:mm)
  return formattedDateTime;
  }
  const datePublished = formatDateForMongo(new Date());
  const sourceDocID = changeEvent.documentKey._id;                    // access the _id of the changed document:
  const sourceCollection = changeEvent.ns;                            // access the collection that the changeEvent is occuring:

  // Get the MongoDB service you want to use (see "Linked Data Sources" tab)
  // Note: In Atlas Triggers, the service name is defaulted to the cluster name.
  const targetCollection = context.services.get("VMDM-DEVCluster").db("vmdm-mirror").collection("classification");   // specify the target database and collection
 
  // Get the "FullDocument" present in the Insert/Replace/Update ChangeEvents
  try {
        const sourceDocument = changeEvent.fullDocument;              // reference the source document that activated this trigger
        const objectType = changeEvent.fullDocument.objectTypeID;
         console.log("object Type is: ", objectType);
        const mirrorDocument = {                                   // construct the new versioned document
        // Modify fields for versioning as needed
            _id: sourceDocID,                                               // set the _id of the new document to the value of the sourceDocument _id 
            name: sourceDocument.name,
            dateLastPublished: datePublished,

        // get field values from the sourceDocument and set the same in the versioned document 
            objectTypeID: objectType,
            parentID: changeEvent.fullDocument.parentID,
        // get all object references
            references: changeEvent.fullDocument.references,
        // get all data containers
            dataContainers: changeEvent.fullDocument.dataContainers,
      // get all values
      values: changeEvent.fullDocument.values
 
           };  
                         // Specify the criteria for the update
        const filter = { _id: sourceDocID }; // Assuming _id is the unique identifier
                        // Set the options to enable upsert (if the document does not exist, insert it)
        const options = { upsert: true };
    
        // Perform the upsert operation
        await targetCollection.updateOne(filter, mirrorDocument, options);        
        

  } catch(err) {
    console.log("error performing mongodb write: ", err.message);
       console.log("read doc ID is: ", sourceDocID);

  }
};
