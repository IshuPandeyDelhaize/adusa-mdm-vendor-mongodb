exports = async function() {
  const collection = context.services.get("VMDM-DEVCluster").db("vmdm-mirror").collection("entity");
  const query = {objectTypeID:"LegacyAR", 'values.a_VendorSource':"WALKER AR"};
//   const query = {objectTypeID:"LegacyAR", 'values.a_VendorSource':"MILLENNIUM"};
  
  // Log the count of documents to process
  const countToProcess = await collection.count(query);
  console.log(`Count of documents to process: ${countToProcess}`);
  
  const documents = await collection.find(query).toArray();

  for (const document of documents) {
    // Use optional chaining to safely access 'a_VendorSource'
    const vendorSource = document.values?.a_VendorSource;
    let division;
        if(document.a_Division){
          await collection.updateOne(
            { _id: document._id },
       { $unset: { "a_Division": "" } } // The field to be removed
       );
    }
    if(vendorSource === "MILLENNIUM"){
      division = "Legacy AUSA";
    } else {
      division = "Legacy DA";
    }
    
    // Check if 'values' exists before attempting to update
    if(document.values) {
      await collection.updateOne(
        { _id: document._id },
        { $set: { "values.a_Division": division } }
      );
    } else {
       console.log("Document ID : ", document._id);
    }

  };
  
  console.log("Conversion complete."); 
};