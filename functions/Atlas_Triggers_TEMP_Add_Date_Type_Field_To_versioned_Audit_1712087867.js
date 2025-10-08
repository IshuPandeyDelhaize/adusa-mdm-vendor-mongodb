/*TEMP_Add_Date_Type_Field_To_versioned_Audit written April 2 2024 by Ron Paro
this is to add a date field with the value converted to DATE frim the Maintenance_Date field
so that the query for deleting docs older than 6 months will work.
*/

exports = async function() {
    const collection = context.services.get("VMDM-DEVCluster").db("vmdm-versioned-Audit").collection("entity"); 
    
    // Retrieve documents from the collection
      const documents = await collection.find().toArray();
      for (const document of documents) {
    // Parse the Maintenance_Date string into a Date object
    const maintenanceDateStr = document.Maintenance_Date;
    const maintenanceDate = new Date(maintenanceDateStr);

    // Update the document to store dateTimePublished as a Date object
    await collection.updateOne(
        { _id: document._id }, // Query to match the current document
        { $set: { dateTimePublished: maintenanceDate } } // Update to set Maintenance_Date as a Date object
    );
};

console.log("Conversion complete.");

};