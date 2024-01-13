// Out:
// - coupon-lottery
// - omen (wróżba) (ox tylko chyba?)
// - portfele
// - pudełka z amunicją
// - magazynki
// - telefony
// - CAŁY HOUSING
// - szafki dowodowe
// - posiadaczae drabin w zamian dostaną krzesło letniskowe
// - niektóre itemy mogą mieć niższą wytrzymałość niż miały wcześniej
// - dodatki do broni (przenosimy samą broń bez attachmentów)
// - wszystkie magazynki pojawią się jako amunicja z tą samą ilością, która była w magazynku
// - wszystkie paczki amunicji zostaną zamienione na amunicję z tą samą ilością, która była w paczce
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
        'carbinerifle': 'WEAPON_CARBINERIFLE',
        'ceramic-pistol': 'WEAPON_CERAMICPISTOL',
        'double-action': 'WEAPON_DOUBLEACTION',
        'heavy-pistol': 'WEAPON_HEAVYPISTOL',
        'machine-pistol': 'WEAPON_MACHINEPISTOL',
        'marksman-pistol': 'WEAPON_MARKSMANPISTOL',
        'micro-smg': 'WEAPON_MICROSMG',
        'mini-smg': 'WEAPON_MINISMG',
        'pistol': 'WEAPON_PISTOL',
        'pistol50': 'WEAPON_PISTOL50',
        'pistol-mk2': 'WEAPON_PISTOL_MK2',
        'weapon-shotgun-beanbag': 'WEAPON_BEANBAG',
        'revolver': 'WEAPON_REVOLVER',
        'weapon-sawnoff-shotgun': 'WEAPON_SAWNOFFSHOTGUN',
        'smg': 'WEAPON_SMG',
        'hunting-rifle': 'WEAPON_SNIPERRIFLE',
        'sns-pistol': 'WEAPON_SNSPISTOL',
        'sns-pistol-mk2': 'WEAPON_SNSPISTOL_MK2',
        'stun-gun': 'WEAPON_STUNGUN',
        'vintage-pistol': 'WEAPON_VINTAGEPISTOL',
        'tactical-rifle': 'WEAPON_TACTICALRIFLE',
        'hand-flashlight': 'WEAPON_FLASHLIGHT',
        'police-bat': 'WEAPON_NIGHTSTICK',
        'knife': 'WEAPON_KNIFE',
        'molotov': 'WEAPON_MOLOTOV',
        'petrol-can': 'WEAPON_PETROLCAN',
        'broken-bottle': 'WEAPON_BOTTLE',
        'baseball-bat': 'WEAPON_BAT',
        'ceramic-pistol': 'WEAPON_CERAMICPISTOL',
        'crowbar': 'WEAPON_CROWBAR',
        'double-action': 'WEAPON_DOUBLEACTION',
        'fire-extinguisher': 'WEAPON_FIREEXTINGUISHER',
        'flare': 'WEAPON_FLARE',
        'golf-club': 'WEAPON_GOLFCLUB',
        'marksman-pistol': 'WEAPON_MARKSMANPISTOL',
        'wrench': 'WEAPON_WRENCH',
        'flashlight': 'at_flashlight',
        'silencer': 'at_suppressor_light',
    },
    ammo: {
        'pistol-ammo': 'ammo_9',
        'rifle-ammo': 'ammo_rifle',
        'shotgun-beanbag-ammo': 'ammo_shotgun_beanbag',
        'cartridge': 'ammo_stungun',
        'weed1g': 'weed1g',
        'water': 'water',
        'pistol-magazine': 'ammo_9',
        'sandwich': 'sandwich',
    },
    ammo_magazines: {
        'pistol-ammo-box': 'ammo_9',
    }
};

const changeNameOfItems = {
    'leather': 'leather1',
}

const changeDurabilityFrom600To100 = [
    'WEAPON_COMBATPISTOL',
    'WEAPON_CERAMICPISTOL',
    'WEAPON_HEAVYPISTOL',
    'WEAPON_PISTOL50',
    'WEAPON_DOUBLEACTION',
    'WEAPON_REVOLVER',
];


convertBtn.addEventListener('click', () => {
   resultInfo.classList.add('disable');
   data.length = 0; 
   data.push(...modifyJsonData(JSON.parse(jsonData.value)));

   const groupedData = data.reduce((acc, item) => {
        let inventoryId = item.inventoryId.replace(/ply-|trunk-|glove-|society-/g, '');
        if (typeof item.metadata === 'string') {
            item.metadata = safeParse(item.metadata); 
        }

        let key;
        if (item.inventoryId.startsWith('ply-')) {
            key = 'users';
        } else if (item.inventoryId.startsWith('trunk-')) {
            key = 'owned_vehicles';
        } else if (item.inventoryId.startsWith('glove-')) {
            key = 'glovebox'; 
        } else if (item.inventoryId.startsWith('house-')) {
            key = 'housing';
        } else if (item.inventoryId.startsWith('society-')) {
            key = 'society';
        }

        acc[key] = acc[key] || {};
        acc[key][inventoryId] = acc[key][inventoryId] || [];
        delete item.inventoryId;
        acc[key][inventoryId].push(item);

        return acc;
    }, {});

    const processUsers = false;
    const processOwnedVehicles = false;
    const processSociety = true;
    const processGlovebox = false;
    const processHousing = false;

    const sqlQueries = [];
    if (processUsers && groupedData.users) {
        for (const [inventoryId, items] of Object.entries(groupedData.users)) {
            const inventoryData = JSON.stringify(items).replace(/'/g, "''").replace(/\\\\"/g, "'");
            sqlQueries.push(`UPDATE users SET inventory = '${inventoryData}' WHERE ID = ${inventoryId};`);
        }
    }
    if (processOwnedVehicles && groupedData.owned_vehicles) {
        for (const [inventoryId, items] of Object.entries(groupedData.owned_vehicles)) {
            const trunkData = JSON.stringify(items).replace(/'/g, "''").replace(/\\\\"/g, "'");
            sqlQueries.push(`INSERT INTO ox_inventorytemp (eqowner, data) VALUES ('plate-${inventoryId}', '${trunkData}');`);
        }
    }
    if (processGlovebox && groupedData.glovebox) {
        for (const [inventoryId, items] of Object.entries(groupedData.glovebox)) {
            const gloveBoxData = JSON.stringify(items).replace(/'/g, "''").replace(/\\\\"/g, "'");
            sqlQueries.push(`UPDATE owned_vehicles SET glovebox = '${gloveBoxData}' WHERE plate = '${inventoryId}';`);
        }
    }
    if (processSociety && groupedData.society) {
        for (const [inventoryId, items] of Object.entries(groupedData.society)) {
            const societyData = JSON.stringify(items).replace(/'/g, "''").replace(/\\\\"/g, "'");
            sqlQueries.push(`INSERT INTO ox_inventory (name, data) VALUES ('${inventoryId}', '${societyData}');`);
        }
    }
    if (processHousing && groupedData.housing) {
        for (const [inventoryId, items] of Object.entries(groupedData.housing)) {
            const usedSlots = new Set();
            const updatedItems = items.map(item => {
                while (usedSlots.has(item.slot)) {
                    item.slot++; 
                }
                usedSlots.add(item.slot);
                return item;
            });
    
            const houseData = JSON.stringify(updatedItems).replace(/'/g, "''").replace(/\\\\"/g, "'");
            sqlQueries.push(`INSERT INTO ox_inventorytemp (eqowner, data) VALUES ('${inventoryId}', '${houseData}');`);
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
   const excludedItems = ['coupon-lottery', 'omen', 'phone'];

   return jsonData.rows
        .filter(row => (row.inventoryId.startsWith('ply-') || row.inventoryId.startsWith('trunk-') || row.inventoryId.startsWith('glove-') || row.inventoryId.startsWith('house-') || row.inventoryId.startsWith('society-')) && row.slot >= 0 && row.slot <= 1000 && !excludedItems.includes(row.dataId))
        .map(row => {
           let amountFound = false;

           if(changeNameOfItems[row.dataId]){
                row.dataId = changeNameOfItems[row.dataId];
            }

            if (row.dataId === 'carton-box'){
                row.dataId = 'chair';
                delete row.metadata;
            }

           if (row.dataId === 'wallet') {
                if (row.metadata) {
                    const metadataObj = JSON.parse(row.metadata);
                    if (metadataObj.cash !== undefined) {
                        row.count = metadataObj.cash;
                        amountFound = true;
                    } else {
                        row.count = 0; 
                    }
                    delete row.metadata;
                }
                row.dataId = 'money'; 
            }

           if (dataIdMap.ammo_magazines[row.dataId]) {
                row.dataId = dataIdMap.ammo_magazines[row.dataId];
                row.count = 30;
                delete row.metadata;
            }

            if (dataIdMap.ammo[row.dataId]) {
                row.dataId = dataIdMap.ammo[row.dataId];
                if (row.metadata) {
                    const metadataObj = JSON.parse(row.metadata);
                    if (metadataObj.ammo !== undefined) {
                        row.count = metadataObj.ammo; 
                        amountFound = true;
                    } else if (metadataObj.amount !== undefined) {
                        row.count = metadataObj.amount;
                        amountFound = true;
                    }
                    else {
                        row.count = 1; 
                    }
                    delete row.metadata;
                }
            }

            Object.entries(dataIdMap).forEach(([category, items]) => {
                if (items[row.dataId]) {
                    row.dataId = items[row.dataId];
                    if (category === 'pistols' && row.metadata) {
                        let metadataObj = JSON.parse(row.metadata);
                        if (metadataObj.durability !== undefined && changeDurabilityFrom600To100.includes(row.dataId)) {
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


           if (row.metadata) {
               const metadataObj = JSON.parse(row.metadata);

               if (row.name === 'money') {
                   if (metadataObj.amount !== undefined) {
                       row.count = metadataObj.amount;
                       delete metadataObj.amount;
                       amountFound = true;
                   }
               }

               if(row.metadata.includes('amount')){
                     row.count = metadataObj.amount;
                     amountFound = true;
               }

               delete metadataObj.lastUpdate;
               delete metadataObj.attachments;
               delete metadataObj.usesLeft;
               delete metadataObj.quality;
               delete metadataObj.shopAmount;
               delete metadataObj.shopPrice;
               delete metadataObj.wetness;
               delete metadataObj.maxAmmo;
               delete metadataObj.ammo;
               
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