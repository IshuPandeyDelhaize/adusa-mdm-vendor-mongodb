/** 
Read_From_Staging_Flattened - Written Feb 2024 by Ron Paro and Sowjanya Tumuluru
This Atlas trigger will listen for incoming documents in the “flattened-docs” database and will do the following:
		1.	If the triggering document is for the BP, then:
			a.	Write new flattened document based on the BP into the Versioned Audit database with a subset of attributes by 
					compiling values from each of the BPs references and it’s children’s references.
			b.	(FUTURE) Write new flattened document based on the BP into the Versioned Full database with all attributes from all objects 
					referenced by the BP and it’s children. (FUTURE)
		2.	If the triggering document is not for the BP, then do nothing and exit.
					
		For the arrays related to Banking details and Addresses, only copy the values from the one that is "current", for Audit message
		arrays, only copy the most recent one, and then for Contacts,  copy from each document in the array and concatonate the values from
		the fields into one multi-value field for the new flattened document, using semi-colons as the separator.
		
		If there are subdocuments (child docs) that do not have a field value for one of the 30 auditable attributes, then still 
		add the field name and the value as NULL when concatonating the values from the same object array. This is so that when 
		one or more of the sub documents in the object array has a value for that attribute, but another one in the same array does not, 
		this will keep the order of the multi-value field values in the correct order.  For example, if there are three BP Contacts for 
		one Business Partner, and the first one does not have a value for Contact_Email, but then the other two do, by entering the first 
		value in the new multi-valued field for the flattened document, then the Email addresses will be known to be for contacts 2 and 3.
*/
exports = async function (changeEvent) {
 

function formatDateForMongo(date) {
  const isoString = date.toISOString();
  const formattedDate = isoString.slice(0, 10); // Extract the first 10 characters (YYYY-MM-DD)
  return formattedDate;
  }
  
  function formatTimeStampForMongo(date) {
  const isoString = date.toISOString();
  const formattedDateTime = isoString.slice(0, 16); // Extract the first 16 characters (YYYY-MM-DDTHH:mm)
  return formattedDateTime;
  }	  
  
  
  // specify the source database and collection
  const flattenedCollection = context.services.get("VMDM-DEVCluster").db("vmdm-staging-Context1").collection("flattened"); 
  // specify the target database and collection
  const targetCollection = context.services.get("VMDM-DEVCluster").db("vmdm-versioned-Audit").collection("entity");   

  const sourceDoc = changeEvent.fullDocument;
  console.log("PM Logs Full Document: "+JSON.stringify(sourceDoc));
  const sourceDocID = changeEvent.documentKey._id;
  const objectType = sourceDoc.objectTypeID;

  try {
    if (objectType === "BusinessPartner") {
      
	   console.log("objectType", objectType);
 		const bpDocID = sourceDocID;
        console.log("BP stepID before WAIT: ", sourceDoc.stepID);
         await new Promise(resolve => setTimeout(resolve, 60000));  // wait 1 minute after the trigger starts to make sure that all of the related docs are available
         console.log("after WAIT: ", sourceDoc.stepID);
        const accountsPayableRef = sourceDoc["references.BPRemittanceReference"];

                let apMakedBankID = "";
				let apPayment_Method= "";
				let apStreetAddress = "";
				let apPOBox = "";
				let apCity = "";
				let apState = "";
				let apZipCode= "";
				let apContactName = "";
				let apContactPhone = "";
				let apContactEmail = "";	 
				let apRemitEmail = "";
				let apLegacyVendorNums = "";
				let apAddressList = "";
				let apContactList = "";
				let apContactRefArray = "";
				let lastUpdateUser = "";
				let latestApprover = "";
				let latestAuditRef = "";
				let lastChangeLogRef = "";
				let apAddrRefArray = "";
				let bpContactRefArray = "";
				let bpAddressRefArray = "";
				let apMaskedBankNum = "";
				let apBankAcctHolderName = "";
				let apBankRoutingNum = "";
				let apBankSwiftCode = "";
                let apMaskedBankUniqueID = "";	
      
	
		console.log("AP stepID:", accountsPayableRef);	
	if(accountsPayableRef){
		
        // do a lookup for the AP document in the Staging.flattened collection to get values from it.
				const apDocument = await flattenedCollection.findOne({ "stepID": accountsPayableRef });
		console.log( apDocument.ID);
		 
				// Check if the document is found
				if (apDocument) {
		  			// Access the fields of the target document Payment_Method: sourceDoc.values.a_PaymentMethod,
		  			apPayment_Method = apDocument['values.a_PaymentMethod'];
		  			apRemitEmail = apDocument['values.a_RemitEmail'];
                  const apMaskedIDList = apDocument['dataContainers.dc_MaskedBankDetails.values.ID'];
					//Read the list of bank details from the data containers and pick the active bank details
                    const apMaskedBankUniqueIDList = apDocument['dataContainers.dc_MaskedBankDetails.values.a_BankUniqueID'];
					const apMaskedBankNumList = apDocument['dataContainers.dc_MaskedBankDetails.values.a_BankAccountNumberMasked'];
					const apBankAcctHolderNameList = apDocument['dataContainers.dc_MaskedBankDetails.values.a_BankAccountHolderName'];
					const apBankRoutingNumList = apDocument['dataContainers.dc_MaskedBankDetails.values.a_BankRoutingNumber'];
					const apBankSwiftCodeList = apDocument['dataContainers.dc_MaskedBankDetails.values.a_SwiftCode']; 
					const apBankValidFromList = apDocument['dataContainers.dc_MaskedBankDetails.values.a_BankDetailStartDate'];
					const apBankValidUntilList = apDocument['dataContainers.dc_MaskedBankDetails.values.a_BankDetailEndDate'];
					let apBankValidFromArray = [];
					let apBankValidUntilArray = [];
					
					if(apBankValidFromList){
						apBankValidFromArray = apBankValidFromList.split(';').map(id => id.trim()); 
					}
					if(apBankValidUntilList){
						apBankValidUntilArray = apBankValidUntilList.split(';').map(id => id.trim()); 
					}
					
					const currentDate = formatDateForMongo(new Date());
					
					const selectedIndex = apBankValidFromArray.findIndex((startDate, index) => {
						const endDate = apBankValidUntilArray[index];
						return startDate <= currentDate && currentDate <= endDate;
					});
					
					if(selectedIndex > -1){
					
						if(apMaskedBankNumList){
							const apMaskedBankNumArray = apMaskedBankNumList.split(';').map(id => id.trim());
							apMaskedBankNum = apMaskedBankNumArray[selectedIndex];
						}
						
						if(apBankAcctHolderNameList){
							const apBankAcctHolderNameArray = apBankAcctHolderNameList.split(';').map(id => id.trim());
							apBankAcctHolderName = apBankAcctHolderNameArray[selectedIndex];
						}
						
						if(apBankRoutingNumList){
							const apBankRoutingNumArray = apBankRoutingNumList.split(';').map(id => id.trim());
							apBankRoutingNum = apBankRoutingNumArray[selectedIndex];
						}
						
						if(apBankSwiftCodeList){
							const apBankSwiftCodeArray = apBankSwiftCodeList.split(';').map(id => id.trim());
							apBankSwiftCode = apBankSwiftCodeArray[selectedIndex];
						}

                      if(apMaskedBankUniqueIDList){
							const apMaskedBankUniqueIDArray = apMaskedBankUniqueIDList.split(';').map(id => id.trim());
							apMaskedBankUniqueID = apMaskedBankUniqueIDArray[selectedIndex];
						}
                      if (apMaskedIDList) {
    const apMaskedIDArray = apMaskedIDList.split(';').map(id => id.trim());
    apMaskedBankID = apMaskedIDArray[selectedIndex]; // Declare this new variable
}
						
						
					}else{
					     console.log("Banking details are misisng in BP or Current banking detail selection failed due to ambigous dates");
					}
					
		  
				    /**
			   		* references.GoldenRecordReferences
				 		* values.a_DSDWEFlag
				 		* values.a_VendorSource
				 		* Legacy_AP_Vendor_Nbrs = values.a_VendorNumber
				 		* values.a_FirmDating
				 		*/
			  		const goldenRecordRef = apDocument["references.GoldenRecordReferences"];
			  		if (goldenRecordRef){
					  		const legacyAPdocList = goldenRecordRef.split(';').map(id => id.trim()); // Splitting the IDs and removing any leading/trailing spaces
					  		// do a lookup for the legacy AP document in the Staging.flattened collection to get values from it.
						 		for (const legacyAPRefID of legacyAPdocList) {
							  		console.log("In loop counter ID from idList:",legacyAPRefID);
										const legacyAPdoc = await flattenedCollection.findOne({ "stepID": legacyAPRefID });
										if (legacyAPdoc) {
									  		console.log(`Document with _id '${legacyAPRefID}' found.`);
									  		const apLegacyVendorNumItr = legacyAPdoc['values.a_VendorNumber'];
									  		//Use slice function to get the last element of the array and and convert the last elemet looked up to String type for the comparsion work
									  		//This block allows to create a string of values delimited by ;s and avoids ; being added after the last element
									  		//Todo- Comment all console logs
									  		if(legacyAPdocList.slice(-1).toString() !== legacyAPRefID){
														apLegacyVendorNums = apLegacyVendorNums + apLegacyVendorNumItr +";";
														console.log("Forming semi colon delimited legacyVendorNums");
												}
									  		else{
													apLegacyVendorNums = apLegacyVendorNums + apLegacyVendorNumItr;
												}
											// Next line is if no legacyAP doc was found
							  		} else {
												console.log(`Document with _id '${legacyAPRefID}' not found.`);
							  	}
							  	// Delete the legacy AP doc that was read in the for loop from the temporary flattened collection
									await flattenedCollection.deleteOne({"stepID": legacyAPRefID});
								} // end for loop
						} // end if (goldenRecordRef)
		  //Construct AP address values for streetline, city, state and zipcode by picking the CURRENT address
	       console.log("AP address processing started");
		  apAddrRefArray = apDocument["references.AdressReference"];
           console.log("apAddrRefArray" , apAddrRefArray);       
		  if(apAddrRefArray){
    		  //apAddressList = apAddrRefArray.split(';').map(id => id.trim());   //Anji changes
                apAddressList = apAddrRefArray.filter(addr => addr.a_AddressStatus === "CURRENT").map(addr => addr.targetID);   //Anji changes
              console.log("apAddressList" , apAddressList);
    		  for (const apAddrRefID of apAddressList) {
    			const apAddrDoc = await flattenedCollection.findOne({ "stepID": apAddrRefID });
    			if(apAddrDoc){
                  console.log("apAddrDoc" ,apAddrDoc);  ////Anji changes
    				//const apAddrStatus = apAddrDoc['values.a_AddressStatus'];    //Anji changes
    				//if(apAddrStatus === "CURRENT"){                               //Anji changes
    					  //console.log("Addr Status:",apAddrStatus);
    					  console.log(`Document with _id '${apAddrRefID}' is applicable\.`);
    					  apStreetAddress = apAddrDoc['values.a_AddressLine1'];
                          console.log("apStreetAddress" ,apStreetAddress);  ////Anji changes
    					  apPOBox = apAddrDoc['values.a_POBox'];
    					  apCity = apAddrDoc['values.a_City'];
    					  apState = apAddrDoc['values.a_State'];	  
    					  apZipCode=  apAddrDoc['values.a_ZipCode'];
    					  console.log("AP Remit ZipCode", apZipCode);
    					  console.log("Assigned Active Address Values");
    					  break;
    			  // }                                                     //Anji changes
    		  }
    		  else{
    			  console.log(`Document with _id '${apAddrRefID}' is not applicable.`);
    		  }
    	  } //end for(const apAddrRefID...
		 }	 // end if apAddrRefArray   
		  
		  //Construct String of AP contact values for phone, name and email
		  apContactRefArray = apDocument["references.ContactReference"];  
      if (apContactRefArray){
    		  apContactList = apContactRefArray.split(';').map(id => id.trim());
    		  for (const apContactRefID of apContactList) {
    			  console.log("In loop counter ID from idList:",apContactRefID);
    			  const apContactDoc = await flattenedCollection.findOne({ "stepID": apContactRefID });
    			  if (apContactDoc) {
    				   console.log(`Document with _id '${apContactRefID}' found.`);
    				   const apContactPhoneItr = apContactDoc['values.a_PhoneNumber'];
    				   const apContactEmailItr = apContactDoc['values.a_Email'];
    				   const apContactNameItr =  apContactDoc['values.a_ContactFirstName']+ " " +apContactDoc['values.a_ContactLastName'];
    			   //Create semi colon delimited multiple values of conatct fields
    			   if(apContactList.slice(-1).toString() !== apContactRefID){
    					apContactPhone = apContactPhone + apContactPhoneItr +";";
    					apContactEmail = apContactEmail + apContactEmailItr +";";
    					apContactName = apContactName + apContactNameItr +";";
    			   }
    			   else{
    					apContactPhone = apContactPhone + apContactPhoneItr;
    					apContactEmail = apContactEmail + apContactEmailItr;
    					apContactName = apContactName + apContactNameItr;
    			   }
    			  } else {
    				    console.log(`Document with _id '${apContactRefID}' not found.`);
    			  }
    			 } // end for loop
	  	} //end  if apContactRefArray	
    			} // end if apDocument
    			else {
    				console.log("Target document of AP not found.");
    			}
    	
		      //Choose the Lastest Change Log Reference from BP based on the latest change date and extract the changedByUser Value
			  const bpChangeLogRefArray = sourceDoc["references.ChangeLogReference"];
        if (bpChangeLogRefArray){
						const bpChangeLogList = bpChangeLogRefArray.split(';').map(id => id.trim());
						const latestTimeComputeMap = new Map();
						const latestTimeComputeMapValues = [];
						for (const changeLogRefID of bpChangeLogList) {
								const changeLogDoc = await flattenedCollection.findOne({ "stepID": changeLogRefID.toString() }); 
								if (changeLogDoc) {
										console.log(`Document with _id '${changeLogRefID}'  found.`);
										const changeTime = changeLogDoc['values.a_ChangeTime'];
										lastUpdateUser = changeLogDoc['values.a_ChangeReviewedBy'];
										latestTimeComputeMapValues[0] = changeLogRefID;
										latestTimeComputeMapValues[1] = lastUpdateUser;
										latestTimeComputeMap.set(changeTime,latestTimeComputeMapValues);					
										console.log(latestTimeComputeMap);
								 }else {
								console.log(`Document with _id '${changeLogRefID}' not found.`);
						  }
						} // end for loop

						keyValueArray = Array.from(latestTimeComputeMap);
							//keyValueArray.forEach(([key,value]) => {
							//console.log("Key:",key);
							//console.log("Values:");
							//value.forEach((element,index) => {
							//console.log(`Value ${index+1}:`, element);});});

						keyValueArray.sort((a,b) => {
						keyA = a[0].toString();
						keyB = b[0].toString();
						return keyA.localeCompare(keyB);
						});

					if(keyValueArray.length >0){
							const [key, values] = keyValueArray[0];
							lastChangeLogRef = values[0];
							lastUpdateUser = values[1];
						}else {
						console.log("Sorted Array for change log is empty");
					}
				} // end if bpChangeLofRefArray 
				
		      //Choose the Latest Audit Object from BP based on the latest change date and extract the latestApprover
			  const bpAuditRefArray = sourceDoc["references.AuditObject"];
        if (bpAuditRefArray){
		
						const bpAuditList = bpAuditRefArray.split(';').map(id => id.trim());  // create a semi-colon separated string of the audit message IDs.
						let latestTimeComputeMap = new Map();
						let latestTimeComputeMapValues = [];
						let auditMessage = "";
						for (const AuditRefID of bpAuditList) {
								const AuditDoc = await flattenedCollection.findOne({ "stepID": AuditRefID.toString() }); 
								if (AuditDoc) {
										console.log(`Document with ID '${AuditRefID}'  found.`);
										const publishTime = AuditDoc['values.a_publishedTime'];
										if(publishTime) {
												//Construct a map with the key being Publish Time of Audit Object and values being AuditRefID and AuditMessage in that order
												latestTimeComputeMapValues[0] = AuditRefID;
												latestTimeComputeMapValues[1] = AuditDoc['values.a_audit_Message'];
												latestTimeComputeMap.set(publishTime,latestTimeComputeMapValues);
												
												//Reset the array of values from the Map to take the values from the next iteration
												latestTimeComputeMapValues = [];      
										}else{
											console.log(`PublishTime is Missing for '${AuditRefID}'`);
										}
								}else {
									console.log(`Document with ID '${AuditRefID}' not found.`);
						              }
						} // end for loop
						
						//Convert the Map to Array
						let keyValueArray = Array.from(latestTimeComputeMap);	
						
						//Sort the elements in the descending of the AuditObject's Publish Time
						if(keyValueArray.length >0){
						
							keyValueArray.sort((a,b) => {
							timeStampA = new Date(a[0]).getTime();
							timeStampB = new Date(b[0]).getTime();
							return timeStampB - timeStampA;
							});
		
							//Fetch the Audit Object with the latest publish time. Extract and assign the values
							const [key, values] = keyValueArray[0];
							latestAuditRef = values[0];
							auditMessage = values[1];
							let transitions = [];
							
							if(auditMessage){
							  
								const parsedAuditData = JSON.parse(auditMessage);                           
								
								if (parsedAuditData.hasOwnProperty('transition')) {
										transitions = parsedAuditData.transition;
										if (!transitions || transitions.length === 0) {
											console.log(`No transitions found for '${latestAuditRef}'`);
								        } else{											
												// Sort the transitions to fetch the last event having the latest timestamp
												const selectedEvent = transitions.slice(-1);

												// Fetch the userID associated with the last event in the workflow
												if (selectedEvent[0].hasOwnProperty('userID')){
														latestApprover = selectedEvent[0].userID;
												}else{
														console.log("Audit Message is malformed and is missing userID");
												    }
										    }
								}else{
									  console.log("Audit Message is malformed and is missing transition events");
								    }	  
							} // End of Audit Message Existence Check
					    } else {
						console.log("Sorted Array for Audit Objects is empty");
							   }
		} // end if bpAuditRefArray


				let bpStreetAddress = "";
				let bpPOBox = "";
				let bpCity = "";
				let bpState = "";
				let bpZipCode= "";
				let bpContactName ="";
				let bpContactPhone = "";
				let bpContactEmail = "";	
			 
			  bpAddressRefArray = sourceDoc["references.AdressReference"];
              //console.log("bpAddressRefArray", bpAddressRefArray);
			  if (bpAddressRefArray){
    			  //const bpAddressList = bpAddressRefArray.split(';').map(id => id.trim());       //Anji changes
                 const bpAddressList = bpAddressRefArray.filter(addr => addr.a_AddressStatus === "CURRENT").map(addr => addr.targetID);   //Anji changes
                //console.log("bpAddressList" , bpAddressList);
    
    			 //Construct BP address values for streetline, city, state and zipcode by picking the CURRENT address
    			 for (const addrRefID of bpAddressList) {
                   //console.log("addrRefID" ,addrRefID);  ////Anji changes
    				  const addrDoc = await flattenedCollection.findOne({ "stepID": addrRefID });
    				  if(addrDoc){
                       // console.log("addrDoc" ,addrDoc);  ////Anji changes
    					//const bpAddrStatus = addrDoc['values.a_AddressStatus'];    ////Anji changes
    					//if(bpAddrStatus === "CURRENT"){     ////Anji changes
    						   console.log(`Document with _id '${addrRefID}' is applicable\.`);
    						   bpStreetAddress = addrDoc['values.a_AddressLine1'];
                               console.log("bpStreetAddress" ,bpStreetAddress);  ////Anji changes
    						   bpPOBox = addrDoc['values.a_POBox'];
    						   bpCity = addrDoc['values.a_City'];
    						   bpState = addrDoc['values.a_State'];
    						   bpZipCode = addrDoc['values.a_ZipCode'];
    						   break;
    				   //}
    				  }
    				  else{
    						console.log(`Document with _id '${addrRefID}' is not applicable.`);
    				  }
    			 } // end for loop
			  } // end if bpAddressRefArray

			  //Construct String of BP contact values for phone, name and email
			  bpContactRefArray = sourceDoc["references.ContactReference"];
			  if (bpContactRefArray){
						const bpContactList = bpContactRefArray.split(';').map(id => id.trim()); // Splitting the IDs and removing any leading/trailing spaces
						for (const contactRefID of bpContactList) {
								console.log("In loop counter ID from idList:",contactRefID);
								const bpContactDoc = await flattenedCollection.findOne({ "stepID": contactRefID });
								if (bpContactDoc) {
										console.log(`Document with _id '${contactRefID}' found.`);
										const bpContactPhoneItr = bpContactDoc['values.a_PhoneNumber'];
										const bpContactEmailItr = bpContactDoc['values.a_Email'];
										const bpContactNameItr =  bpContactDoc['values.a_ContactFirstName']+ " " + bpContactDoc['values.a_ContactLastName'];
										//Create semi colon delimited multiple values
										if(bpContactList.slice(-1).toString() !== contactRefID){
												bpContactPhone = bpContactPhone + bpContactPhoneItr +";";
												bpContactEmail = bpContactEmail + bpContactEmailItr +";";
												bpContactName = bpContactName + bpContactNameItr +";";
										}
										else{
												bpContactPhone = bpContactPhone + bpContactPhoneItr;
												bpContactEmail = bpContactEmail + bpContactEmailItr;
												bpContactName = bpContactName + bpContactNameItr;
										}
									} else {
										console.log(`Document with _id '${contactRefID}' not found.`);
									}
						} // end for loop
			  } // end if bpContactRefArray
			  
			 // Parse the Maintenance_Date string into a Date object
        const maintenanceDateStr = formatTimeStampForMongo(new Date());
			  const maintenanceDate = new Date(maintenanceDateStr);
			  
				const versionedDocument = {
						_id: sourceDocID,
						stepID: sourceDoc.stepID,
						apID: accountsPayableRef,
						bpChangeLogRefID: lastChangeLogRef,
				    bpAuditRefID: latestAuditRef,
						Financial_BP_ID: sourceDoc['values.a_FinancialBPNumber'],
						Financial_BP_Name: sourceDoc['values.a_VendorName'],
						Vendor_Name_Full: sourceDoc['values.a_VendorNameFull'],
						DBA_Vendor_Name: sourceDoc['values.a_SecondaryBPName'],
						Tax_ID: sourceDoc['values.a_TaxIDMasked'],
					  Maintenance_Date: maintenanceDateStr,
						Payment_Method: apPayment_Method,
						Account_Holder_Name: apBankAcctHolderName,						
						Routing_Nbr: apBankRoutingNum,						
						Bank_Account_Nbr: apMaskedBankNum,			
						Swift_Code: apBankSwiftCode,
						apAddressRefID: apAddrRefArray,
						apContactRefID: apContactRefArray,
						Remit_Street_Address: apStreetAddress,
						Remit_PO_Box: apPOBox,
						Remit_City: apCity,
						Remit_State: apState,
						Remit_Zip: apZipCode,
						Remit_Contact_Name: apContactName,
						Remit_Contact_Phone: apContactPhone,
						Remit_Contact_Email: apContactEmail, 
						Remit_Email_Address: apRemitEmail,
						Legacy_AP_Vendor_Nbrs: apLegacyVendorNums,
						bpAddressRefID: bpAddressRefArray,
						bpContactRefID: bpContactRefArray,
						Corp_Street_Address: bpStreetAddress,
						Corp_PO_Box: bpPOBox,
						Corp_City: bpCity,
						Corp_State: bpState,
						Corp_Zip: bpZipCode,
						Corp_Contact_Email: bpContactEmail, 
						Corp_Contact_Name: bpContactName,
						Corp_Contact_Phone: bpContactPhone,
						Approver_User_ID: latestApprover,
                        Bank_Account_ID:apMaskedBankID,
						dateTimePublished: maintenanceDate  // This is a date type field to be used for the trigger that checks if the doc is over 180 days old, to delete.
				};
		
		// Insert the new versioned document into the targetCollection
        await targetCollection.insertOne(versionedDocument);           
        console.log("Done with insert to vmdm-versioned-Audit"); 
      } 
	}  
      else {
      }
  } catch (err) {
    console.log("Error performing MongoDB write:", err.message);
  }
};
