//Read_From_Staging_Entity
/** Trigger written by Ron Paro 3-14-2024
*  For the initial load from VMDM, after all data arrives into the vmdm-staging database in MongDB, this Atlas Trigger will read new documents and it will write to the
*  following databases and then remove the document from vmdm-Staging after writing to the other databases.  This is to allow for versioning.
1.	Copy the incoming documents into the Mirror database in the same format and with the same _id: as they have in the staging database (this id is the STEP object ID).
2.	Write flattened documents for each doc type into a “flattened-docs” database. These will have one doc for the BP, one for the AP, one for the AR, on for each of the contacts, etc.
*/
exports = async function() {
	function formatDateForMongo(date) {
		const isoString = date.toISOString();
		const formattedDateTime = isoString.slice(0, 16);
		// Extract the first 16 characters (YYYY-MM-DDTHH:mm)
		return formattedDateTime;
	}
	const sourceCollection = context.services.get("VMDM-DEVCluster").db("vmdm-staging-Context1").collection("entity");
	// objectTypeID: "BusinessPartner"
	// type: "entity"
	const query = {type: "entity" };
	// Log the count of documents to process
	const countToProcess = await sourceCollection.count(query);
	console.log("Count of documents to process: ", countToProcess);
	if (countToProcess > 0) {
		// Option 1: Loop through the array and delete each document
		const documents = await sourceCollection.find(query).toArray();
		for (const document of documents) {
			console.log(`BP ID is: ${document._id}`);
			const datePublished = formatDateForMongo(new Date());
			const sourceDocID = document._id;
			// access the _id of the changed document:
			// Get the MongoDB service you want to use (see "Linked Data Sources" tab)
			// Note: In Atlas Triggers, the service name is defaulted to the cluster name.
			const targetCollection = context.services.get("VMDM-DEVCluster").db("vmdm-mirror").collection("entity");
			// specify the target database and collection
			// Get the "FullDocument" present in the Insert/Replace/Update ChangeEvents
			//  try {
			//   const sourceDocument = document.fullDocument;              // reference the source document that activated this trigger
			const objectType = document.objectTypeID;
			console.log("object Type is: ", objectType);
			const mirrorDocument = {
				// construct the new versioned document
				// Modify fields for versioning as needed
				_id: sourceDocID, // set the _id of the new document to the value of the sourceDocument _id
				dateTimePublished: datePublished,
				// get field values from the sourceDocument and set the same in the versioned document
				objectTypeID: objectType,
				parentID: document.parentID,
				// get all object references
				references: document.references,
				// get all data containers
				dataContainers: document.dataContainers,
				// get all values
				values: document.values
			};  // end const mirrorDocument =
			// Specify the criteria for the update
			const filter = {_id: sourceDocID };
			// Assuming _id is the unique identifier
			// Set the options to enable upsert (if the document does not exist, insert it)
			const options = {upsert: true };
			// Perform the upsert operation
			await targetCollection.updateOne(filter, mirrorDocument, options);

			
			// This next section recursively flattens a nested document by converting
			// arrays of objects into semicolon-separated strings and maintaining
			// the structure of other fields.
			// Write the temporary flattened docs into the vmdm-staging database in the "flattened" collection.
			const targetFlattenedDocs = context.services.get("VMDM-DEVCluster").db("vmdm-staging-Context1").collection("flattened");
			const newID = new BSON.ObjectId();
			const flattenDocument = (obj, parentKey = "") => {
				// Initialize an empty object to store the flattened document.
				const result = new Map();
				// Iterate through each key in the input document.
				for (const key in obj) {
					// Create a new key by concatenating the parent key and the current key.
					let newKey = parentKey ? `${parentKey}.${key}` : key;
					// Skip processing keys that start with "extValues"
					if (newKey.startsWith("extValues.")) {
						continue;
					}
					// Check if the current field (obj[key]) is an array using Array.isArray.
					if (Array.isArray(obj[key])) {
						if (newKey === 'dataContainers.dc_MaskedBankDetails') {
							obj[key].forEach((item, index) => {
								const nestedKey = `${newKey}.values`;
								for (const subKey in item.values) {
									let dcLoV = "";
									const fullKey = `${nestedKey}.${subKey}`;
									dcLoV = item.values[subKey];
									if(result.has(fullKey)){
										let existingdcLoV = result.get(fullKey);
										result.set(fullKey, existingdcLoV + ";" + dcLoV);
									}
									else{
										result.set(fullKey, dcLoV);
									}
								}  // end for (const subKey in item.values)
							});  // obj[key].forEach((item, index)
						}  // end if (newKey === 'dataContainers.dc_MaskedBankDetails')
						else {
							// If it's an array, map the array to extract targetID values and join them with semicolons.
							result.set(newKey,obj[key].map(item => item.targetID).join('; '));
						}
					}  // end if (Array.isArray(obj[key])
					else if (typeof obj[key] === 'object' && obj[key] !== null) {
						const subMap = flattenDocument(obj[key], newKey);
						subMap.forEach((subKey, value) => {
							result.set(value, subKey);
							//value has the key name and subKey has the corresponding values
						});
					}
					else {
						// If it's neither an array nor an object, assign the current field to the result.
						result.set(newKey, obj[key]);
					}
				}  // end for (const key in obj)
				// Return the flattened document.
				return result;
			};  // end const flattenDocument
			const flattenedDocument = flattenDocument(document);
			const stepIDVal = document._id;
			const versionedDocument = {
				stepID: stepIDVal,
				dateTimePublished: new Date(),
				_id: newID,
			};
			for (const [key, value] of flattenedDocument.entries()) {
				if(key === "_id"){
					continue;
					//To avoid flatten doc to overwrite the values declared in the versioned document
				}
				else{
					versionedDocument[key] = value;
				}
			}
			await targetFlattenedDocs.insertOne(versionedDocument);
		}  // end for (const document of documents) 
		}  // end if (countToProcess > 0)
		else {
			console.log("No documents to process.");
		}
		//     const targetCollection1 = context.services.get("VMDM-DEVCluster").db("vmdm-staging-Context1").collection("entity");   // specify the target database and collection
		// delete the document in the other collection
		//        await targetCollection1.deleteOne({"_id": stepIDVal});
		//  } catch(err) {
		//       console.log("error performing mongodb write: ", err.message);
		//       console.log("read doc ID is: ", sourceDocID);
		//  }
};