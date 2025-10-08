exports = async function() {
  /**
This is a utilty trigger to be used for clearing out test documents as needed.  Add or uncomment code to remove all docs 
 * from the collection listed, then enable this trigger only long enough to have it remove the docs, then come back and disable it.  
 * Don't forget to click on Save at the bottom right.
**/
 //   Access a mongodb service:
   const collection1 = context.services.get("VMDM-DEVCluster").db("vmdm-staging-Context1").collection("entity");
    const collection1b = context.services.get("VMDM-DEVCluster").db("vmdm-staging-Context1").collection("flattened");
     const collection1c = context.services.get("VMDM-DEVCluster").db("vmdm-staging-Context1").collection("classification");
      const collection2 = context.services.get("VMDM-DEVCluster").db("vmdm-versioned-BP").collection("entity");
      const collection4 = context.services.get("VMDM-DEVCluster").db("vmdm-versioned-Audit").collection("entity");
      const collection6 = context.services.get("VMDM-DEVCluster").db("vmdm-mirror").collection("entity");
      const collection6b = context.services.get("VMDM-DEVCluster").db("vmdm-mirror").collection("classification");
     
      
    await collection1.deleteMany({}); 
    await collection1b.deleteMany({}); 
    await collection1c.deleteMany({});
    await collection2.deleteMany({}); 
    await collection4.deleteMany({}); 
    await collection6.deleteMany({});
    await collection6b.deleteMany({});

  };
