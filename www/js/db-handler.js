/*
  Copyright 2018 David Healey

  This file is part of Waistline.

  Waistline is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  Waistline is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with Waistline.  If not, see <http://www.gnu.org/licenses/>.
*/

var dbHandler =
{
  DB:{},

  initializeDb: function()
  {
    return new Promise(function(resolve, reject){
      //Open database
      var databaseName = 'waistlineDb';
      var databaseVersion = 23;
      var openRequest = indexedDB.open(databaseName, databaseVersion);

      //Error handler
      openRequest.onerror = function(e)
      {
          console.log("Error Opening DB", e);
      };

      //Success handler
      openRequest.onsuccess = function(e)
      {
          DB = openRequest.result;
          console.log("Success!!! Database opened");
          resolve();
      };

      //Only called when version number changed (or new database created)
      openRequest.onupgradeneeded = function(e)
      {
          DB = e.target.result;
          var store;

          var upgradeTransaction = e.target.transaction;

          //Log store
          if (!DB.objectStoreNames.contains("log")) {
            store = DB.createObjectStore("log", {keyPath:'dateTime'});
          } else {
            store = upgradeTransaction.objectStore('log');
          }

          if (!store.indexNames.contains("goals")) store.createIndex('goals', 'goals', {unique:false});
          if (!store.indexNames.contains("nutrition")) store.createIndex('nutrition', 'nutrition', {unique:false}); //Nutrition consumtion
          if (!store.indexNames.contains("weight")) store.createIndex('weight', 'weight', {unique:false}); //Current weight

          //Food list store
          if (!DB.objectStoreNames.contains("foodList")) {
            store = DB.createObjectStore('foodList', {keyPath:'id', autoIncrement:true});
          } else {
            store = upgradeTransaction.objectStore('foodList');
          }

          if (!store.indexNames.contains("dateTime")) store.createIndex('dateTime', 'dateTime', {unique:false}); //Date object, the last time this item was referenced (edited or added to the diary)
          if (!store.indexNames.contains("name")) store.createIndex('name', 'name', {unique:false});
          if (!store.indexNames.contains("brand")) store.createIndex('brand', 'brand', {unique:false});
          if (!store.indexNames.contains("image_url")) store.createIndex('image_url', 'image_url', {unique:false});
          if (!store.indexNames.contains("portion")) store.createIndex('portion', 'portion', {unique:false}); //Serving size - e.g. 100g, 1 slice, 1 pie, etc.
          if (!store.indexNames.contains("nutrition")) store.createIndex('nutrition', 'nutrition', {unique:false}); //All of the nutrition per portion
          if (!store.indexNames.contains("barcode")) store.createIndex('barcode', 'barcode', {unique:false});

          //Diary Store - a kind of mini food list, independent of the main food list
          if (!DB.objectStoreNames.contains("diary")) {
            store = DB.createObjectStore('diary', {keyPath:'id', autoIncrement:true});
          } else {
            store = upgradeTransaction.objectStore('diary');
          }

          if (!store.indexNames.contains("dateTime")) store.createIndex('dateTime', 'dateTime', {unique:false}); //Date object
          if (!store.indexNames.contains("name")) store.createIndex('name', 'name', {unique:false});
          if (!store.indexNames.contains("brand")) store.createIndex('brand', 'brand', {unique:false});
          if (!store.indexNames.contains("portion")) store.createIndex('portion', 'portion', {unique:false});
          if (!store.indexNames.contains("quantity")) store.createIndex('quantity', 'quantity', {unique:false}); //The number of portions
          if (!store.indexNames.contains("category")) store.createIndex('category', 'category', {unique:false}); //Index of the category
          if (!store.indexNames.contains("category_name")) store.createIndex('category_name', 'category_name', {unique:false}); //user assigned name of the category
          if (!store.indexNames.contains("foodId")) store.createIndex('foodId', 'foodId', {unique:false}); //ID of food in food object store - might be useful for some stuff
          if (!store.indexNames.contains("nutrition")) store.createIndex('nutrition', 'nutrition', {unique:false}); //All of the nutrition per portion

          //Recipes store
          if (!DB.objectStoreNames.contains("meals")) {
            store = DB.createObjectStore("meals", {keyPath:'id', autoIncrement:true});
          } else {
            store = upgradeTransaction.objectStore('meals');
          }

          if (!store.indexNames.contains("dateTime")) store.createIndex('dateTime', 'dateTime', {unique:false});
          if (!store.indexNames.contains("name")) store.createIndex('name', 'name', {unique:false}); //Meal name
          if (!store.indexNames.contains("foods")) store.createIndex('foods', 'foods', {unique:false}); //Food items - record is separate from foods table
          if (!store.indexNames.contains("nutrition")) store.createIndex('nutrition', 'nutrition', {unique:false}); //Total nutritional values for the whole meal
          if (!store.indexNames.contains("notes")) store.createIndex('notes', 'notes', {unique:false}); //Useful to add notes to recipes
          console.log("DB Created/Updated");
      };
    });
  },

  insert: function(data, storeName)
  {
    var request = DB.transaction(storeName, "readwrite").objectStore(storeName).put(data); //Add/update data

    request.onerror = function(e)
    {
      console.log("Transaction Error!");
    };

    return request;
  },

  update: function(data, storeName, key)
  {
    return new Promise(function(resolve, reject){
      var objectStore = DB.transaction(storeName, "readwrite").objectStore(storeName);
      var request = objectStore.get(key);

      request.onsuccess = function(event) {

        var result = event.target.result; //Data from DB

        if (result)
        {
          //Update the result with values from the passed data object
          for (k in data) //Each key in data
          {
              result[k] = data[k];
          }
        }
        else { //Valid key passed but no data found
          result = data; //Just insert data
        }
        //Insert the updated result
        var updateRequest = objectStore.put(result);
        updateRequest.onsuccess = function(e)
        {
          resolve();
        }
      };

      request.onerror = function(event) {
        console.log("DB Update Error");
        resolve();
      };

    });
  },

  deleteItem: function(key, storeName)
  {
    var request = DB.transaction(storeName, "readwrite").objectStore(storeName).delete(key);

    request.oncomplete = function(e)
    {
      console.log("Transaction Complete");
    }

    request.onerror = function(e)
    {
      console.log("Transaction Error!: " + e);
    };

    return request;
  },

  getAllItems : function(storeName)
  {
    return new Promise(function(resolve, reject){
      var results = [];
      var objectStore = DB.transaction(storeName).objectStore(storeName);

      objectStore.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        }
        else {
          resolve(results);
        }
      };
    });
  },

  getItem: function(key, storeName)
  {
    return DB.transaction(storeName).objectStore(storeName).get(key);
  },

  getByMultipleKeys: function(keys, storeName)
  {
    return new Promise(function(resolve, reject){

      var objectStore = DB.transaction(storeName).objectStore(storeName);
      var results = [];

      keys.forEach(function(key) {
        objectStore.get(key).onsuccess = function(e) {
          results.push(e.target.result);
          if (results.length === keys.length) {
             resolve(results);
          }
        };
      });
    });
  },

  getIndex: function(key, storeName)
  {
    return DB.transaction(storeName).objectStore(storeName).index(key);
  },

  getObjectStore: function(storeName)
  {
    return DB.transaction(storeName).objectStore(storeName);
  },

  getArrayFromObject:function(obj)
  {
    //Turn object into an array
    return $.map(obj, function(value, index) {
        return [value];
    });
  },

  exportToFile:function()
  {
    if (DB.objectStoreNames.length > 0)
    {
      var exportObject = {};
      var t = DB.transaction(DB.objectStoreNames, "readonly"); //Get transaction
      var storeNames = dbHandler.getArrayFromObject(DB.objectStoreNames);

      //Get data for each store
      storeNames.forEach(function(storeName)
      {
        var objects = [];

        t.objectStore(storeName).openCursor().onsuccess = function(event)
        {
          var cursor = event.target.result;
          if (cursor)
          {
            objects.push(cursor.value);
            cursor.continue();
          }
          else
          {
            exportObject[storeName] = objects; //Each store's objects in a separate element

            //Append object store to file once all objects have been gathered
            if (Object.keys(exportObject).length == storeNames.length)
            {
              dbHandler.writeToFile(JSON.stringify(exportObject));
            }
          }
        }
      });
    }
  },

  importFromJson: function(jsonString)
  {
    var t = DB.transaction(DB.objectStoreNames, "readwrite"); //Get transaction
    var storeNames = dbHandler.getArrayFromObject(DB.objectStoreNames);
    var importObject = JSON.parse(jsonString); //Parse recieved JSON string

    //Go through each object store and add the imported data
    storeNames.forEach(function(storeName)
    {
      //If there is no data to import for this object
      if (importObject[storeName].length == 0)
      {
        delete importObject[storeName];
      }
      else
      {
        t.objectStore(storeName).clear().onsuccess = function() //Clear object store
        {
          var count = 0;

          importObject[storeName].forEach(function(toAdd)
          {
            //Make sure dateTime entries are imported as date objects rather than strings
            if (toAdd.dateTime)
            {
              toAdd.dateTime = new Date(toAdd.dateTime);
            }

            var request = t.objectStore(storeName).add(toAdd);

            request.onerror = function(e)
            {
              console.log("Problem importing database. Stopped at " + storeName + " object store:", e.target.error.message);
              alert("Something went wrong, are you sure the file exists?");
            }

            request.onsuccess = function(e)
            {
              count++;

              if (count == importObject[storeName].length) //added all objects for this store
              {
                delete importObject[storeName];

                if(Object.keys(importObject).length == 0) //added all object stores
                {
                 console.log("Database import success");
                 alert("Database Import Complete");
                }
              }
            }
          });
        }
      }
    });
  },

  writeToFile: function(jsonString)
  {
    //Export the json to a file
    window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function(dir)
    //window.requestFileSystem(PERSISTENT, 1024*1024, function(dir) //For browser testing
    {
      console.log("got main dir",dir);

      //Create the file
      dir.getFile("waistline_export.json", {create:true}, function(file)
      //dir.root.getFile("waistline_export.json", {create:true}, function(file)  //For browser testing
      {
        console.log("got the file", file.isFile.toString());

        //Write to the file - overwrite existing content
        file.createWriter(function(fileWriter)
        {
          var blob = new Blob([jsonString], {type:'text/plain'});
          fileWriter.write(blob);

          fileWriter.onwriteend = function()
          {
            console.log("Successful file write.");
            alert("Database Export Complete");
          };

          fileWriter.onerror = function (e)
          {
            console.log("Failed file write: " + e.toString());
            alert("Something went wrong, you deserve a more detailed error message but I don't have one for you!");
          };
        });
      });
    });
  },

  readFromFile: function()
  {
    var jsonString;

    console.log("Called read from file");

    window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, success, fail);
    //window.requestFileSystem(PERSISTENT, 1024*1024, success, fail); //For browser testing

    function fail(e)
    {
      console.log("FileSystem Error", e);
      alert("Something went wrong, are you sure the file exists?");
      return false;
    }

    function success(dir)
    {
      console.log("Got file system");

      dir.getFile('waistline_export.json', {}, function(file)
      //dir.root.getFile('waistline_export.json', {}, function(file) //For browser testing
      {
        console.log("Got the file", file.isFile.toString());

        file.file(function (file)
        {
          var reader = new FileReader();

          reader.readAsText(file);

          reader.onloadend = function(e)
          {
            jsonString = this.result;
            console.log("Successful file read: ", this.result);
            dbHandler.importFromJson(jsonString);
          };

          reader.onerror = function(e)
          {
            console.log("Read Error:", e);
            alert("Something went wrong, are you sure the file exists?");
          };
        });
      });
    }
  },
}
