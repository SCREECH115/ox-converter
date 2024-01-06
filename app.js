// Out:
// - coupon-lottery
// - omen (wróżba) (ox tylko chyba?)
// - portfele
// - pudełka z amunicją
// - magazynki
// - telefony
// - CAŁY HOUSING
// - dodatki do broni (przenosimy samą broń bez attachmentów)
// - warto, żeby gracze wpłacili całość gotówki na konta bankowe (item pieniedzy też zostanie przeniesiony dla to kwestia bezpieczenstwa)
// - czy na ox durability 100 to maks? jezeli tak to trzeba ustawic wszystko na 100, aktualne bornie maja po 600
// - wszystkie itemy z ziemi out
// - przenosimy tylko player, housing i vehicles
// - maxAmmo, Ammo?

// TODO: 
// vehicles (trunk-ABC12345)
// business (society-society_weed)

const jsonData = document.querySelector('#input-data');
const convertBtn = document.querySelector('#convert-button');
const copyBtn = document.querySelector('#copy-results-button');
const resultInfo = document.querySelector('.result');
const resultConvert = document.querySelector('.result-convert');

const data = [];
let combinedSql = '';

const dataIdMap = {
    pistols: {
        'combat-pistol': 'WEAPON_COMBATPISTOL',
    },
    ammo: {
        'pistol-ammo': 'ammo_9',
    },
};

convertBtn.addEventListener('click', () => {
   resultInfo.classList.add('disable');
   data.length = 0; 
   data.push(...modifyJsonData(JSON.parse(jsonData.value)));

   const groupedData = data.reduce((acc, item) => {
        let inventoryId = item.inventoryId.replace(/ply-|trunk-/g, '');
        if (typeof item.metadata === 'string') {
            item.metadata = safeParse(item.metadata); 
        }

        let key = item.inventoryId.startsWith('ply-') ? 'users' : 'owned_vehicles';
        acc[key] = acc[key] || {};
        acc[key][inventoryId] = acc[key][inventoryId] || [];
        delete item.inventoryId;
        acc[key][inventoryId].push(item);

        return acc;
    }, {});

    const sqlQueries = [];
    if (groupedData.users) {
        for (const [inventoryId, items] of Object.entries(groupedData.users)) {
            const inventoryData = JSON.stringify(items).replace(/'/g, "''").replace(/\\\\"/g, "'");
            sqlQueries.push(`UPDATE users SET inventory = '${inventoryData}' WHERE ID = ${inventoryId};`);
        }
    }
    if (groupedData.owned_vehicles) {
        for (const [inventoryId, items] of Object.entries(groupedData.owned_vehicles)) {
            const trunkData = JSON.stringify(items).replace(/'/g, "''").replace(/\\\\"/g, "'");
            sqlQueries.push(`UPDATE owned_vehicles SET trunk = '${trunkData}' WHERE plate = '${inventoryId}';`);
        }
    }

    combinedSql = sqlQueries.join('\n');
    jsonData.value = combinedSql;
    console.log('sql:');
    console.log(combinedSql);
});

copyBtn.addEventListener('click', () => {
   navigator.clipboard.writeText(combinedSql)
     .then(() => {
       console.log('Tekst skopiowany do schowka!');
       resultInfo.classList.remove('disable');
     })
     .catch(err => {
       console.error('Błąd podczas kopiowania: ', err);
     });
});


// ------------------------------------------------------------
// CONVERT TO CORRECT JSON ---------------------------------------------
// ------------------------------------------------------------

function modifyJsonData(jsonData) {
   const excludedItems = ['coupon-lottery', 'omen', 'wallet', 'sniper-magazine', 'phone'];

   return jsonData.rows
        .filter(row => (row.inventoryId.startsWith('ply-') || row.inventoryId.startsWith('trunk-')) && row.slot >= 0 && row.slot <= 23 && !excludedItems.includes(row.dataId))
        .map(row => {
            Object.entries(dataIdMap).forEach(([category, items]) => {
                if (items[row.dataId]) {
                    row.dataId = items[row.dataId];
                    if (category === 'pistols' && row.metadata) {
                        let metadataObj = JSON.parse(row.metadata);
                        if (metadataObj.durability) {
                            metadataObj.durability = Math.round(metadataObj.durability / 6);
                        }
                        row.metadata = JSON.stringify(metadataObj);
                    }
                }
            });

           row.name = row.dataId.includes('-') && !['cash', 'money'].includes(row.dataId)
                     ? row.dataId.replace(/-/g, '_')
                     : row.dataId;

           if (row.name === 'cash') {
               row.name = 'money';
           }

           let amountFound = false;

           if (row.metadata) {
               const metadataObj = JSON.parse(row.metadata);

               if (row.name === 'money') {
                   if (metadataObj.amount !== undefined) {
                       row.count = metadataObj.amount;
                       delete metadataObj.amount;
                       amountFound = true;
                   }
               }

               delete metadataObj.lastUpdate;
               delete metadataObj.attachments;
               delete metadataObj.usesLeft;
               delete metadataObj.quality;
               
               if (metadataObj.identifier) {
                   metadataObj.serial = metadataObj.identifier;
                   delete metadataObj.identifier;
               }
               if (metadataObj.durability) {
                   metadataObj.durability = Math.round(metadataObj.durability);
               }

               if (Object.keys(metadataObj).length === 0) {
                   delete row.metadata;
               } else {
                   row.metadata = JSON.stringify(metadataObj);
               }
           }

           if (!amountFound) {
               row.count = 1;
           }

           row.slot += 1;

           delete row.id;
           delete row.dataId;

           return row;
       });
}


// ------------------------------------------------------------
// JSON PARSE ---------------------------------------------
// ------------------------------------------------------------

const safeParse = (jsonString) => {
   try {
       return JSON.parse(jsonString);
   } catch (e) {
       return jsonString;
   }
 };