const { app, BrowserWindow, ipcRenderer, ipcMain, Menu, dialog } = require('electron');
const fs = require('fs')
const path = require('path');
//const os = require('os-utils')
const OBSWebSocket = require('obs-websocket-js');
const { Client, Server } = require('node-osc');
const { error } = require('console');
const PDFWindow = require('electron-pdf-window')
const obs = new OBSWebSocket();

let qlabCue
let listSceneItems
let autoConnect
let zoomoscload
let zoomoscsave
let zoomoscupdate
let zoomoscinclude
let zoomosclist
let zoomoscgalleryview
let isPinned = 0

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}
  
// const createPdfWin = () => {
// const pdfWin = new PDFWindow({
//     width: 479,
//     height: 900,
//     darkTheme: true, 
//     webPreferences: {
//         nodeIntegration: true 
//       }
//   })
//     pdfWin.loadFile(path.join(__dirname, 'README.html'));
// }

let logging
const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 240,
    height: 780,
    webPreferences: {
      nodeIntegration: true 
    }
  });
  


//Make boolean if Mac
const isMac = process.platform === 'darwin'

//Construct Menu Toolbar ------
const template = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: "AutoCropper",
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      isMac ? { role: 'close' } : { role: 'quit' },
      { 
        label: 'Save As...', 
        accelerator: 'Shift+CommandOrControl+s',
        click() {
          saveAsFile()
        }
      },
      { 
        label: 'Open', 
        accelerator: 'CommandOrControl+o',
        click() {
          openFile()
        }

      },
      { 
        label: 'Open/Connect', 
        accelerator: 'CommandOrControl+Shift+o',
        click() {
          openFileConnect()
        }

      },
      {
        label: 'Automatically Connect on Startup',
        type: 'checkbox',
        checked: false,
        click: function (item) {
            if (item.checked == false) {
              autoConnect = false
            } else if (item.checked == true) {
              autoConnect = true
            }
          }
      },
      { 
        label: 'Revert to Default Values', 
        accelerator: 'CommandOrControl+Shift+/',
        click() {
          openOriginalFile()
        }

      }
    ]
  },
  // { role: 'editMenu' }
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac ? [
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [
            { role: 'startSpeaking' },
            { role: 'stopSpeaking' }
          ]
        }
      ] : [
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ])
    ]
  },
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ] : [
        { role: 'close' }
      ])
    ]
  },
  {
    label: 'Scripts',
    submenu: [
      { 
        label: 'Populate QLab OSC Cues From OBS Scenes',
        accelerator: 'CommandOrControl+1',
        click(){
            qlabCue();
        }
    },
        { 
            label: 'Log All Available Scene Items (Sources)',
            accelerator: 'CommandOrControl+2',
            click(){
                listSceneItems();
            } 
        },
        { 
            label: 'ZoomOSC: Load',
            accelerator: 'CommandOrControl+l',
            click(){
                zoomoscload();
            } 
        },
        { 
            label: 'ZoomOSC: Update',
            accelerator: 'CommandOrControl+u',
            click(){
                zoomoscupdate();
            } 
        },
        { 
            label: 'ZoomOSC: Include',
            accelerator: 'CommandOrControl+i',
            click(){
                zoomoscinclude();
            } 
        },
        { 
            label: 'ZoomOSC: Save',
            accelerator: 'CommandOrControl+;',
            click(){
                zoomoscsave();
            } 
        },
        { 
            label: 'ZoomOSC: Get Gallery Order',
            accelerator: 'CommandOrControl+,',
            click(){
                zoomosclist();
            } 
        },
        { 
            label: 'ZoomOSC: Set Gallery View',
            accelerator: 'CommandOrControl+g',
            click(){
                zoomoscgalleryview();
            } 
        },
        { 
            label: 'Create OBS Scenes and Sources',
            accelerator: 'CommandOrControl+.',
            click(){

                const createWindow2 = () => {
                    // Create the browser window.
                    const mainWindow2 = new BrowserWindow({
                      width: 240,
                      height: 180,
                      webPreferences: {
                        nodeIntegration: true 
                      }
                    });
                // and load the index.html of the app.
                mainWindow2.loadFile(path.join(__dirname, 'indexobs.html'));

                }
                createWindow2()
            } 
            
        },
    ]
  },
  {
    role: 'help',
    submenu: [ 
        {
            label: 'Getting Started',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://github.com/jshea2/AutoCropper-for-ZoomOSC-OBS#setup')
          }
        },
        {
            label: 'OSC for OBS API',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://github.com/jshea2/OBSosc#osc-command-list')
          }
        },
        {
            label: 'Get Support',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://discord.com/invite/FJ79AKPgSk')
          }
        }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

//Open File
function openFile() {
dialog.showOpenDialog(mainWindow, {
  properties: ['openFile'],
  filters: [{ name: 'Text', extensions: ['txt'] }]
}).then((result) => {
    mainWindow.setSize(500,780)
  mainWindow.webContents.openDevTools();
  const file = result.filePaths
console.log(file)
const fileContent = fs.readFileSync(file[0], {encoding:'utf8', flag:'r'})
// Make file an array
let openArray = fileContent.split('\n')
if(openArray[0] !== "OBSosc Config File:"){
    logEverywhere("Invalid File Type!")
    return
}
//OBS IP
obsIp = openArray[1]
console.log(obsIp)
mainWindow.webContents.send("obsip", obsIp)
//OBS Port
obsPort = openArray[2]
console.log(obsPort)
mainWindow.webContents.send("obsport", obsPort)
//OBS Password
obsPassword = openArray[3]
console.log(obsPassword)
mainWindow.webContents.send("obspassword", obsPassword)
//OSC IN IP
oscServerIp = openArray[4]
console.log(oscServerIp)
mainWindow.webContents.send("oscinip", oscServerIp)
//OSC IN IP
oscPortIn = openArray[5]
console.log(oscPortIn)
mainWindow.webContents.send("oscinport", oscPortIn)
//Enable OSC Command Out on Active OBS Scene
enableObs2App = openArray[6]
console.log(enableObs2App)
mainWindow.webContents.send("enableobs2app", enableObs2App)
//OSC OUT IP
oscClientIp = openArray[7]
console.log(oscClientIp)
mainWindow.webContents.send("oscoutip", oscClientIp)
//OSC OUT Port
oscPortOut = openArray[8]
console.log(oscPortOut)
mainWindow.webContents.send("oscoutport", oscPortOut)
//OSC OUT Prefix Message
oscOutPrefix = openArray[9]
console.log(oscOutPrefix)
mainWindow.webContents.send("oscoutprefix", oscOutPrefix)
//OSC OUT Suffix Message
oscOutSuffix = openArray[10]
console.log(oscOutSuffix)
mainWindow.webContents.send("oscoutsuffix", oscOutSuffix)
//ZoomOSC IP
zoomOSCClientIp = openArray[11]
console.log(zoomOSCClientIp)
mainWindow.webContents.send("zoomoscinip", zoomOSCClientIp)
//ZoomOSC Port IN
zoomOSCPortIn = openArray[12]
console.log(zoomOSCPortIn);
mainWindow.webContents.send("zoomoscinport", zoomOSCPortIn)
//ZoomOSC Port OUT
zoomOSCPortOut = openArray[13]
console.log(zoomOSCPortOut);
mainWindow.webContents.send("zoomoscoutport", zoomOSCPortOut)
//Screen Width
screenWidth = openArray[14]
console.log(screenWidth);
mainWindow.webContents.send("screenwidth", screenWidth)
//Screen Height
screenHeight = openArray[15]
console.log(screenHeight);
mainWindow.webContents.send("screenheight", screenHeight)
//isRetina
isRetina = openArray[16]
console.log(isRetina);
mainWindow.webContents.send("isretina", isRetina)
//Remove Names
removeNames = openArray[17]
console.log(removeNames);
mainWindow.webContents.send("removenames", removeNames)



logEverywhere("File Opened!")
})
}

//Open File and Connect
function openFileConnect() {
    dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Text', extensions: ['txt'] }]
    }).then((result) => {
        mainWindow.setSize(500,780)
      mainWindow.webContents.openDevTools();
      const file = result.filePaths
    console.log(file)
    const fileContent = fs.readFileSync(file[0], {encoding:'utf8', flag:'r'})
    // Make file an array
    let openArray = fileContent.split('\n')
    if(openArray[0] !== "OBSosc Config File:"){
        logEverywhere("Invalid File Type!")
        return
    }
    //OBS IP
    obsIp = openArray[1]
    console.log(obsIp)
    mainWindow.webContents.send("obsip", obsIp)
    //OBS Port
    obsPort = openArray[2]
    console.log(obsPort)
    mainWindow.webContents.send("obsport", obsPort)
    //OBS Password
    obsPassword = openArray[3]
    console.log(obsPassword)
    mainWindow.webContents.send("obspassword", obsPassword)
    //OSC IN IP
    oscServerIp = openArray[4]
    console.log(oscServerIp)
    mainWindow.webContents.send("oscinip", oscServerIp)
    //OSC IN IP
    oscPortIn = openArray[5]
    console.log(oscPortIn)
    mainWindow.webContents.send("oscinport", oscPortIn)
    //Enable OSC Command Out on Active OBS Scene
    enableObs2App = openArray[6]
    console.log(enableObs2App)
    mainWindow.webContents.send("enableobs2app", enableObs2App)
    //OSC OUT IP
    oscClientIp = openArray[7]
    console.log(oscClientIp)
    mainWindow.webContents.send("oscoutip", oscClientIp)
    //OSC OUT Port
    oscPortOut = openArray[8]
    console.log(oscPortOut)
    mainWindow.webContents.send("oscoutport", oscPortOut)
    //OSC OUT Prefix Message
    oscOutPrefix = openArray[9]
    console.log(oscOutPrefix)
    mainWindow.webContents.send("oscoutprefix", oscOutPrefix)
    //OSC OUT Suffix Message
    oscOutSuffix = openArray[10]
    console.log(oscOutSuffix)
    mainWindow.webContents.send("oscoutsuffix", oscOutSuffix)
    //ZoomOSC IP
    zoomOSCClientIp = openArray[11]
    console.log(zoomOSCClientIp)
    mainWindow.webContents.send("zoomoscinip", zoomOSCClientIp)
    //ZoomOSC Port IN
    zoomOSCPortIn = openArray[12]
    console.log(zoomOSCPortIn);
    mainWindow.webContents.send("zoomoscinport", zoomOSCPortIn)
    //ZoomOSC Port OUT
    zoomOSCPortOut = openArray[13]
    console.log(zoomOSCPortOut);
    mainWindow.webContents.send("zoomoscoutport", zoomOSCPortOut)
    //Screen Width
    screenWidth = openArray[14]
    console.log(screenWidth);
    mainWindow.webContents.send("screenwidth", screenWidth)
    //Screen Height
    screenHeight = openArray[15]
    console.log(screenHeight);
    mainWindow.webContents.send("screenheight", screenHeight)
    //isRetina
    isRetina = openArray[16]
    console.log(isRetina);
    mainWindow.webContents.send("isretina", isRetina)
    //Remove Names
    removeNames = openArray[17]
    console.log(removeNames);
    mainWindow.webContents.send("removenames", removeNames) 

    mainWindow.webContents.send("obsconnect")

    
    logEverywhere("File Opened!")
    })
    }

//Open Original File
function openOriginalFile() {
    const fileContent = fs.readFileSync(path.join(__dirname, "defaultOriginal.txt"), {encoding:'utf8', flag:'r'})
    // Make file an array
    let openArray = fileContent.split('\n')
    if(openArray[0] !== "OBSosc Config File:"){
        logEverywhere("Invalid File Type!")
        return
    }
    //OBS IP
    obsIp = openArray[1]
    console.log(obsIp)
    mainWindow.webContents.send("obsip", obsIp)
    //OBS Port
    obsPort = openArray[2]
    console.log(obsPort)
    mainWindow.webContents.send("obsport", obsPort)
    //OBS Password
    obsPassword = openArray[3]
    console.log(obsPassword)
    mainWindow.webContents.send("obspassword", obsPassword)
    //OSC IN IP
    oscServerIp = openArray[4]
    console.log(oscServerIp)
    mainWindow.webContents.send("oscinip", oscServerIp)
    //OSC IN IP
    oscPortIn = openArray[5]
    console.log(oscPortIn)
    mainWindow.webContents.send("oscinport", oscPortIn)
    //Enable OSC Command Out on Active OBS Scene
    enableObs2App = openArray[6]
    console.log(enableObs2App)
    mainWindow.webContents.send("enableobs2app", enableObs2App)
    //OSC OUT IP
    oscClientIp = openArray[7]
    console.log(oscClientIp)
    mainWindow.webContents.send("oscoutip", oscClientIp)
    //OSC OUT Port
    oscPortOut = openArray[8]
    console.log(oscPortOut)
    mainWindow.webContents.send("oscoutport", oscPortOut)
    //OSC OUT Prefix Message
    oscOutPrefix = openArray[9]
    console.log(oscOutPrefix)
    mainWindow.webContents.send("oscoutprefix", oscOutPrefix)
    //OSC OUT Suffix Message
    oscOutSuffix = openArray[10]
    console.log(oscOutSuffix)
    mainWindow.webContents.send("oscoutsuffix", oscOutSuffix)
    //ZoomOSC IP
    zoomOSCClientIp = openArray[11]
    console.log(zoomOSCClientIp)
    mainWindow.webContents.send("zoomoscinip", zoomOSCClientIp)
    //ZoomOSC Port IN
    zoomOSCPortIn = openArray[12]
    console.log(zoomOSCPortIn);
    mainWindow.webContents.send("zoomoscinport", zoomOSCPortIn)
    //ZoomOSC Port OUT
    zoomOSCPortOut = openArray[13]
    console.log(zoomOSCPortOut);
    mainWindow.webContents.send("zoomoscoutport", zoomOSCPortOut)
    //Screen Width
    screenWidth = openArray[14]
    console.log(screenWidth);
    mainWindow.webContents.send("screenwidth", screenWidth)
    //Screen Height
    screenHeight = openArray[15]
    console.log(screenHeight);
    mainWindow.webContents.send("screenheight", screenHeight)
    //isRetina
    isRetina = openArray[16]
    console.log(isRetina);
    mainWindow.webContents.send("isretina", isRetina)
    //Remove Names
    removeNames = openArray[17]
    console.log(removeNames);
    mainWindow.webContents.send("removenames", removeNames)
    //Set Automatically Connect on Startup Off
    autoConnect = false
    menu.items[1].submenu.items[4].checked = false
    
    logEverywhere("Reverted to Original Values.")
    }

//Save File
function saveAsFile(){
    logEverywhere("Make Sure to 'Connect' before you Save!")
  dialog.showSaveDialog({ 
    title: 'Select the File Path to save', 
    defaultPath: app.getPath('documents') + '/obsosc_configfile.txt', 
    // defaultPath: path.join(__dirname, '../assets/'), 
    buttonLabel: 'Save', 
    // Restricting the user to only Text Files. 
    filters: [ 
        { 
            name: 'Text Files', 
            extensions: ['txt', 'docx'] 
        }, ], 
    properties: [] 
}).then(file => { 
    // Stating whether dialog operation was cancelled or not. 
    console.log(file.canceled); 
    if (!file.canceled) { 
        console.log(file.filePath.toString()); 
          
        // Creating and Writing to the sample.txt file 
        fs.writeFile(file.filePath.toString(),  
                     `OBSosc Config File:\n${obsIp}\n${obsPort}\n${obsPassword}\n${oscServerIp}\n${oscPortIn}\n${enableObs2App}\n${oscClientIp}\n${oscPortOut}\n${oscOutPrefix}\n${oscOutSuffix}\n${zoomOSCClientIp}\n${zoomOSCPortIn}\n${zoomOSCPortOut}\n${screenWidth}\n${screenHeight}\n${isRetina}\n${removeNames}`, function (err) { 
            if (err) throw err; 
            logEverywhere('File Saved!'); 
        }); 
    } 
}).catch(err => { 
    console.log(err) 
}); 
}




  mainWindow.on('closed', function(){
      // On Close it Saves New Default Values
    fs.writeFile(path.join(__dirname, 'default.txt').toString(),  
      `OBSosc Config File:\n${obsIp}\n${obsPort}\n${obsPassword}\n${oscServerIp}\n${oscPortIn}\n${enableObs2App}\n${oscClientIp}\n${oscPortOut}\n${oscOutPrefix}\n${oscOutSuffix}\n${zoomOSCClientIp}\n${zoomOSCPortIn}\n${zoomOSCPortOut}\n${screenWidth}\n${screenHeight}\n${isRetina}\n${removeNames}\n${autoConnect}`, function (err) { 
if (err) throw err;
}); 
    app.quit()
})

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  //Set Path for Icon 
  const imgpath = path.join(__dirname, 'extraResources', '/icon.png');

  //Send Pathname to Renderer 
  setTimeout(() => {
    mainWindow.webContents.send("imgpath", imgpath)
  }, 600);

  console.log(menu.items[1].submenu.items[4].checked)


// Open Default.txt and Import Values
setTimeout(() => { 
  const fileContent = fs.readFileSync(path.join(__dirname, "default.txt"), {encoding:'utf8', flag:'r'})
  // Make file an array
  let openArray = fileContent.split('\n')
  if(openArray[0] !== "OBSosc Config File:"){
      logEverywhere("Invalid File Type!")
      return
  }
  //OBS IP
  obsIp = openArray[1]
  console.log(obsIp)
  mainWindow.webContents.send("obsip", obsIp)
  //OBS Port
  obsPort = openArray[2]
  console.log(obsPort)
  mainWindow.webContents.send("obsport", obsPort)
  //OBS Password
  obsPassword = openArray[3]
  console.log(obsPassword)
  mainWindow.webContents.send("obspassword", obsPassword)
  //OSC IN IP
  oscServerIp = openArray[4]
  console.log(oscServerIp)
  mainWindow.webContents.send("oscinip", oscServerIp)
  //OSC IN IP
  oscPortIn = openArray[5]
  console.log(oscPortIn)
  mainWindow.webContents.send("oscinport", oscPortIn)
  //Enable OSC Command Out on Active OBS Scene
  enableObs2App = openArray[6]
  console.log(enableObs2App)
  mainWindow.webContents.send("enableobs2app", enableObs2App)
  //OSC OUT IP
  oscClientIp = openArray[7]
  console.log(oscClientIp)
  mainWindow.webContents.send("oscoutip", oscClientIp)
  //OSC OUT Port
  oscPortOut = openArray[8]
  console.log(oscPortOut)
  mainWindow.webContents.send("oscoutport", oscPortOut)
  //OSC OUT Prefix Message
  oscOutPrefix = openArray[9]
  console.log(oscOutPrefix)
  mainWindow.webContents.send("oscoutprefix", oscOutPrefix)
  //OSC OUT Suffix Message
  oscOutSuffix = openArray[10]
  console.log(oscOutSuffix)
  mainWindow.webContents.send("oscoutsuffix", oscOutSuffix)
  //ZoomOSC IP
  zoomOSCClientIp = openArray[11]
  console.log(zoomOSCClientIp)
  mainWindow.webContents.send("zoomoscinip", zoomOSCClientIp)
  //ZoomOSC Port IN
  zoomOSCPortIn = openArray[12]
  console.log(zoomOSCPortIn);
  mainWindow.webContents.send("zoomoscinport", zoomOSCPortIn)
  //ZoomOSC Port OUT
  zoomOSCPortOut = openArray[13]
  console.log(zoomOSCPortOut);
  mainWindow.webContents.send("zoomoscoutport", zoomOSCPortOut)
  //Screen Width
  screenWidth = openArray[14]
  console.log(screenWidth);
  mainWindow.webContents.send("screenwidth", screenWidth)
  //Screen Height
  screenHeight = openArray[15]
  console.log(screenHeight);
  mainWindow.webContents.send("screenheight", screenHeight)
  //isRetina
  isRetina = openArray[16]
  console.log(isRetina);
  mainWindow.webContents.send("isretina", isRetina)
  //Remove Names
  removeNames = openArray[17]
  mainWindow.webContents.send("removenames", removeNames)
  //Auto Connect on Startup
  if(openArray[18] === 'true'){
      autoConnect = true
      menu.items[1].submenu.items[4].checked = true
  } else if (openArray[18] === 'false'){
    autoConnect = false
    menu.items[1].submenu.items[4].checked = false
  }
  console.log(autoConnect)

  if(autoConnect === true || autoConnect === "true"){
    mainWindow.setSize(500,780)
    mainWindow.webContents.openDevTools();
    mainWindow.webContents.send("obsconnect")
  }
  
}, 800);
  

ipcMain.on("submitted", (event, data) => {
    // Open the DevTools.
    mainWindow.setSize(500,780)
mainWindow.webContents.openDevTools();
})

ipcMain.on("obsip", (event, data) => {
obsIp = data
console.log(data)
})

ipcMain.on("obsport", (event, data) => {
obsPort = data
console.log(data)
})

ipcMain.on("obspassword", (event, data) => {
obsPassword = data
console.log(data)
})

ipcMain.on("oscinip", (event, data) => {
oscServerIp = data
console.log(data)
})

ipcMain.on("oscinport", (event, data) => {
oscPortIn = data
console.log(data)
})

ipcMain.on("enableoscout", (event, data) => {
enableObs2App = data
console.log(data)
})

ipcMain.on("oscoutip", (event, data) => {
oscClientIp = data
console.log(data)
})

ipcMain.on("oscoutport", (event, data) => {
oscPortOut = data
console.log(data)
})

ipcMain.on("oscoutprepend", (event, data) => {
oscOutPrefix = data
console.log(data)
})

ipcMain.on("oscoutpostpend", (event, data) => {
oscOutSuffix = data
console.log(data)
})

ipcMain.on("zoomoscinip", (event, data) => {
zoomOSCClientIp = data
console.log(data)
})

ipcMain.on("zoomoscinport", (event, data) => {
zoomOSCPortIn = data
console.log(data)
})

ipcMain.on("zoomoscoutport", (event, data) => {
zoomOSCPortOut = data
console.log(data)
})

ipcMain.on("screenwidth", (event, data) => {
screenWidth = data
console.log(data)
})

ipcMain.on("screenheight", (event, data) => {
screenHeight = data
console.log(data)
})

ipcMain.on("isretina", (event, data) => {
isRetina = data
//console.log("this is retina" + data)
})

ipcMain.on("removenames", (event, data) => {
removeNames = data
console.log(data)
})

ipcMain.on("obssceneauto", (event, data) => {
logEverywhere(`Created ${data} OBS Scenes`)
// for (i = 1; i < parseInt(data) + 1; i++) {
//     console.log(i.toString())
let i = 1
function myLoop () {
    setTimeout(() => {
        obs.send('CreateScene', {
            sceneName: `${i}`
        }).catch((err)=>{
            console.log(err);
        })

        setTimeout(() => {
            obs.send('CreateSource', {
                sourceName: `Display Capture ${i}`,
                sourceKind: "display_capture",
                sceneName: `${i}`,
                sourceSettings: {
                    display: 1,
                    show_cursor: false
                }
        }).then(() => {
            obs.send("GetVideoInfo").then(data => {
    
                obs.send("SetSceneItemProperties", {
                "scene-name": `${i}`,
                item: {
                    name: `Display Capture ${i}`,
                },
                position: {
                    x: 0,
                    y: 0
                },
                bounds: {
                   type: "OBS_BOUNDS_SCALE_INNER",
                   x: data.baseWidth,
                   y: data.baseHeight
                }
            }).catch(() => {
                console.log("Error: Select A Scene Item in OBS for Size")
                logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
            })
            
            }).catch(() => {
                console.log("Error: Select A Scene Item in OBS for Size")
                logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
            })
        }).catch((err)=>{
            console.log(err)
        })
        i++
        }, 25);

        if(i < parseInt(data)){
        myLoop()
    }
    }, 50);
}
myLoop()
//}

})

  function logEverywhere(message) {
    if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.executeJavaScript(`console.log(\`${message}\`)`);
    }
    }

  setInterval(() => {
    if(logging !== undefined){
      mainWindow.webContents.send("Logging", logging)
      logging = undefined
    }
  }, 500);


//NODE-OBSosc
//by Joe Shea

//INPUT YOUR STUFF HERE:
//OBS Config
let obsIp = "127.0.0.1"
let obsPort = 4444;
let obsPassword = "secret"
//OSC Server (IN) Config
let oscServerIp = "127.0.0.1";
let oscPortIn = 3333;
//Enable OBS -> App Control
let enableObs2App = false
//OSC Client (OUT) Config
let oscClientIp = "127.0.0.1";
let oscPortOut = 53000;
let oscOutPrefix = "/cue/"
let oscOutSuffix = "/start"
//ZoomOSC Server (IN) Config
let zoomOSCPortIn = 2345;
//ZoomOSC Client (OUT) Config
let zoomOSCClientIp = "127.0.0.1";
let zoomOSCPortOut = 9090;
//ZoomOSC Delay
let millisec = 614
// AutoCrop
let screenWidth = 1920
let screenHeight = 1080
let removeNames = false
let isRetina = 1
let extraTopMarginNum = 0

//Connect to OBS
ipcMain.on("obsConnect", (event, data) => {
obs.connect({
        address: obsIp + ':'+ obsPort,
        password: obsPassword
    })
    .then(() => {
        logging = `\nConnected & authenticated to OBS Websockets...\nIP: ${obsIp}\nPort: ${obsPort}`;
        console.log(logging)
        logEverywhere(`\nConnected & authenticated to OBS Websockets...\nIP: ${obsIp}\nPort: ${obsPort}`)
    })
    .then(() => {
        return obs.send('GetVersion')
    })
    .then(data => {
            logEverywhere(`Current OBS Studio Version: \n${data['obs-studio-version']}`)
            logEverywhere(`Current obs-websocket Plugin Version: \n${data['obs-websocket-version']}`)
            return obs.send('GetSceneList');                                    //Send a Get Scene List Promise
    })
    .then(data => {
        clientZoom.send("/zoom/load")
        clientZoom.send("/zoom/me/setGalleryView")
        clientZoom.send("/zoom/me/enableOriginalSound")
        clientZoom.send("/zoom/me/hideUserNames")
        clientZoom.send("/zoom/me/hideNonVideoParticipants")
        clientZoom.send("/zoom/me/hideSelfView")
        clientZoom.send("/zoom/list")
        clientZoom.send("/zoom/autoUpdate", 1)
        clientZoom.send("/zoom/subscribe", 2)
        console.log(`\n${data.scenes.length} Available Scenes.` + "\n");    //Log Total Scenes
        logEverywhere(`\n${data.scenes.length} Available Scenes.` + "\n")
        console.log(data.scenes.forEach((thing, index) => {
            console.log((index + 1) + " - " + thing.name);
            logEverywhere((index + 1) + " - " + thing.name)                 //Log List of Available Scenes with OSC Index
        }));

        console.log('-- Reference ( Help > API ) for all OSC Commands --\n\n');      //Log OSC Scene Syntax
        logEverywhere('-- Reference "Help">"API" for all OSC Commands --\n\n')

    })
    .catch(err => {
        console.log(err);
        logEverywhere(err)                                                 //Log Catch Errors
        console.log("ERROR: Make Sure OBS is Running, Websocket Plugin is Installed, and IP/Port/Password are Correct");
        logEverywhere("ERROR: Make Sure OBS is Running, Websocket Plugin is Installed, and IP/Port/Password are Correct")
    });

//Qlab AutoPopulate Function
qlabCue = function createQlabCues() {
    obs.send('GetSceneList').then(data => {
        data.scenes.forEach(i => {
            client.send("/new", "network", "1", (err) => {
                if (err) console.error(err);
                    })
            client.send("/cue/selected/customString", `/scene "${i.name}"`, (err) => {
                if (err) console.error(err);
                    })
            client.send("/cue/selected/name", `${i.name}`, (err) => {
                if (err) console.error(err);
                    })
        })
    })
}
//List Scene Items Function
listSceneItems = function listSceneItems(){
    return obs.send("GetSceneList").then(data => {
        logEverywhere("--- Available Scene Items: ---")
        // logEverywhere(data.name)
        // logEverywhere(msg[1])
        data.scenes.forEach(i => {
            obs.send("GetSceneItemList", {
                'sceneName': i.name,
            }).then(data => {
                data.sceneItems.forEach(j => {
                    console.log(j)
                    logEverywhere(j.sourceName)
                })
            }).catch(error => {
                logEverywhere("ERROR: Invalid Syntax")
            })
        })

    })
}
//Save Scene Item as Variable
let currentSceneItem
obs.on("SceneItemSelected", data => {
    currentSceneItem = data['item-name']
    logEverywhere("Selected Scene Item: " + currentSceneItem)
    
})
// Handler to Avoid Uncaught Exceptions.
obs.on('error', err => {
    console.error('socket error:', err);
    logEverywhere(err)
});

//Connect to OSC
const client = new Client(oscClientIp, oscPortOut);
var server = new Server(oscPortIn, oscServerIp);
const clientZoom = new Client(zoomOSCClientIp, zoomOSCPortOut);
var serverZoom = new Server(zoomOSCPortIn, zoomOSCClientIp);


//OSC Server (IN)
server.on('listening', () => {
  console.log("\n\n" + 'OSC Input is listening on...\n IP: ' + oscServerIp + '\n Port: ' + oscPortIn);
  logEverywhere("\n\n" + 'OSC Input is listening on...\n IP: ' + oscServerIp + '\n Port: ' + oscPortIn)
    console.log('\nOSC Output is sending on...\n IP: ' + oscClientIp + '\n Port: ' + oscPortOut);
  logEverywhere('\nOSC Output is sending on...\n IP: ' + oscClientIp + '\n Port: ' + oscPortOut)
  logEverywhere("\n\n" + 'ZoomOSC Server is listening on...\n IP: ' + zoomOSCClientIp + '\n Port In: ' + zoomOSCPortIn + " Port Out: " + zoomOSCPortOut);

  let enabledisablestring
if(enableObs2App){
    enabledisablestring = "Enabled"
    console.log('\nOBS On Active Scene OSC Output is ' + enabledisablestring );
  logEverywhere('\nOBS On Active Scene OSC Output is ' + enabledisablestring )

} else {
    enabledisablestring = "Disabled"
    console.log('\nOBS On Active Scene OSC Output is ' + enabledisablestring);
  logEverywhere('\nOBS On Active Scene OSC Output is ' + enabledisablestring)

}
  })

  //Toolbar Script Functions
zoomoscload = function zoomoscload(){
    clientZoom.send("/zoom/load")
    logEverywhere("Sent /zoom/load to ZoomOSC")
}
zoomoscupdate = function zoomoscupdate(){
    clientZoom.send("/zoom/update")
    logEverywhere("Sent /zoom/update to ZoomOSC")
}
zoomoscinclude = function zoomoscinclude(){
    clientZoom.send("/zoom/include")
    logEverywhere("Sent /zoom/include to ZoomOSC")
}
zoomoscsave = function zoomoscsave(){
    clientZoom.send("/zoom/save")
    logEverywhere("Sent /zoom/save to ZoomOSC")
}
zoomosclist = function zoomosclist(){
    clientZoom.send("/zoom/list")
    logEverywhere("Sent /zoom/list to ZoomOSC")
}
zoomoscgalleryview = function zoomoscgalleryview(){
    clientZoom.send("/zoom/me/setGalleryView")
    logEverywhere("Sent /zoom/me/setGalleryView to ZoomOSC")
}


//OSC -> OBS
server.on('message', (msg) => {
    //Trigger Scene by Index Number
    if (msg[0] === "/scene" && typeof msg[1] === 'number'){ 
      console.log("number thing works")                                     //When OSC Recieves a /scene do...
      var oscMessage = msg[1] - 1;                                          //Convert Index Number to Start at 1
      var oscMessage = Math.floor(oscMessage);                              //Converts Any Float Argument to Lowest Integer
    return obs.send('GetSceneList').then(data => {                          //Request Scene List Array
        console.log(`OSC IN: ${msg[0]} ${oscMessage + 1} (${data.scenes[oscMessage].name})`)
        logEverywhere(`OSC IN: ${msg[0]} ${oscMessage + 1} (${data.scenes[oscMessage].name})`)
        obs.send("SetCurrentScene", {
            'scene-name': data.scenes[oscMessage].name                      //Set to Scene from OSC
            })
        }).catch(() => {
            console.log("Error: Out Of '/scene' Range"); 
            logEverywhere("Error: Out Of '/scene' Range")                   //Catch Error
        });
    } 
    //Trigger Scene if Argument is a String and Contains a Space
    else if (msg[0] === "/scene" && msg.length > 2){                      //When OSC Recieves a /scene do...                                       
        var firstIndex = msg.shift();                                       //Removes First Index from 'msg' and Stores it to Another Variable
        oscMultiArg = msg.join(' ')                                         //Converts 'msg' to a String with spaces
      return obs.send('GetSceneList').then(data => {                        //Request Scene List Array
          console.log(`OSC IN: ${firstIndex} ${oscMultiArg}`)
          logEverywhere(`OSC IN: ${firstIndex} ${oscMultiArg}`)
          obs.send("SetCurrentScene", {
              'scene-name': oscMultiArg                                     //Set to Scene from OSC
              }).catch(() => {
                console.log(`Error: There is no Scene "${oscMultiArg}" in OBS. Double check case sensitivity.`);
                logEverywhere(`Error: There is no Scene "${oscMultiArg}" in OBS. Double check case sensitivity.`);
              })
          }).catch((err) => {
              console.log(err) 
              logEverywhere(err)                                                           //Catch Error
          });
    } 
    //Trigger Scene if Argument is a String
    else if (msg[0] === "/scene" && typeof msg[1] === 'string'){          //When OSC Recieves a /scene do...
    var oscMessage = msg[1]; 
    return obs.send('GetSceneList').then(data => {                         //Request Scene List Array
        console.log(`OSC IN: ${msg[0]} ${oscMessage}`)
        logEverywhere(`OSC IN: ${msg[0]} ${oscMessage}`)
        obs.send("SetCurrentScene", {
            'scene-name': oscMessage                                       //Set to Scene from OSC
            }).catch(() => {
            console.log(`Error: There is no Scene "${msg[1]}" in OBS. Double check case sensitivity.`);
            logEverywhere(`Error: There is no Scene "${msg[1]}" in OBS. Double check case sensitivity.`);

            })
        }).catch((err) => {
            console.log(err) 
            logEverywhere(err)                                                           //Catch Error
        });
    } 
    //Trigger Scene if Scene Name is in the OSC String
    else if (msg[0].includes('/scene') && msg.length === 1){
    var msgArray = msg[0].split("/")
    msgArray.shift()
    msgArray.shift()
    obs.send("SetCurrentScene", {
        'scene-name': msgArray[0].split("_").join(" ").toString(),                                          //Set to Scene from OSC
        }).catch(() => {
            console.log(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.`);
            logEverywhere(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.`);

        }).catch((err) => {
        console.log(err) 
        logEverywhere(err)                                               //Catch Error
    });
    }
    //Trigger Preview Scene if Argument is a String
    else if (msg[0] === "/previewScene" && typeof msg[1] === 'string'){          //When OSC Recieves a /scene do...
    var oscMessage = msg[1]; 
        logEverywhere(`OSC IN: ${msg[0]} ${oscMessage}`)
        obs.send("SetPreviewScene", {
            'scene-name': oscMessage                                       //Set to Scene from OSC
            }).catch(() => {
            console.log(`Error: There is no Scene "${msg[1]}" in OBS. Double check case sensitivity.`);
            logEverywhere(`Error: There is no Scene "${msg[1]}" in OBS. Double check case sensitivity.`);
            })
    }
    //Trigger Preview Scene if Scene Name is in the OSC String
    else if (msg[0].includes('/previewScene') && msg.length === 1){
    var msgArray = msg[0].split("/")
    msgArray.shift()
    msgArray.shift()
    obs.send("SetPreviewScene", {
        'scene-name': msgArray[0].split("_").join(" ").toString(),                                          //Set to Scene from OSC
        }).catch(() => {
            console.log(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.`);
            logEverywhere(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.`);

        })
    }
    //Trigger StudioMode Transition
    else if (msg[0] === "/studioTransition"){
    obs.send("TransitionToProgram", {
        'with-transition': {
            name: msg[1],
            duration: msg[2]
        }
    })
    }
    //Triggers to "GO" to the Next Scene
    else if (msg[0] === "/go"){                                          //When OSC Recieves a /go do...
            
        return obs.send('GetSceneList').then(data => {                      //Request Scene List Array
            
            var cleanArray = []
            var rawSceneList = data                                         //Assign Get Scene List 'data' to variable 
            data.scenes.forEach(element => {cleanArray.push(element.name)}); //Converting Scene List To a Cleaner(Less Nested) Array (Getting the Desired Nested Values) 
            return obs.send("GetCurrentScene").then(data => {               //Request Current Scene Name
                var currentSceneIndex = cleanArray.indexOf(data.name)       //Get the Index of the Current Scene Referenced from the Clean Array
                if (currentSceneIndex + 1 >= rawSceneList.scenes.length){   //When the Current Scene is More than the Total Scenes...
                obs.send("SetCurrentScene", {
                        'scene-name': rawSceneList.scenes[0].name           //Set the Scene to First Scene
                })
             } else {
                obs.send("SetCurrentScene", {
                    'scene-name': rawSceneList.scenes[currentSceneIndex + 1].name  //Set Scene to Next Scene (Referenced from the Current Scene and Array)
                    })   
                }
        }).catch(() => {
            console.log("Error: Invalid OSC Message");                              //Catch Error
            logEverywhere("Error: Invalid OSC Message");                              //Catch Error

            });
        })
    } 
    //Triggers Previous Scene to go "BACK"
    else if (msg[0] === "/back"){                                                 //Same Concept as Above Except Going to the Previous Scene

        return obs.send('GetSceneList').then(data => {
            
            var cleanArray = []
            var rawSceneList = data
            data.scenes.forEach(element => {cleanArray.push(element.name)});
            return obs.send("GetCurrentScene").then(data => {
                var currentSceneIndex = cleanArray.indexOf(data.name)
                if (currentSceneIndex - 1 <= -1){
                obs.send("SetCurrentScene", {
                        'scene-name': rawSceneList.scenes[rawSceneList.scenes.length - 1].name 
                })
             } else {
                obs.send("SetCurrentScene", {
                    'scene-name': rawSceneList.scenes[currentSceneIndex - 1].name
                    })   
                }
        }).catch(() => {
            console.log("Error: Invalid OSC Message");
            logEverywhere("Error: Invalid OSC Message")
            });
        })


    } 
    //Triggers Start Recording
    else if (msg[0] === "/startRecording"){
        obs.send("StartRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Stop Recording
    else if (msg[0] === "/stopRecording"){
        obs.send("StopRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Toggle Recording
    else if (msg[0] === "/toggleRecording"){
        obs.send("StartStopRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Start Streaming
    else if (msg[0] === "/startStreaming"){
        obs.send("StartStreaming").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Stop Streaming
    else if (msg[0] === "/stopStreaming"){
        obs.send("StopStreaming").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Toggle Streaming
    else if (msg[0] === "/toggleStreaming"){
        obs.send("StartStopStreaming").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Pause Recording
    else if (msg[0] === "/pauseRecording"){
        obs.send("PauseRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Resume Recording
    else if (msg[0] === "/resumeRecording"){
        obs.send("ResumeRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Enable Studio Mode
    else if (msg[0] === "/enableStudioMode"){
        obs.send("EnableStudioMode").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Disable Studio Mode
    else if (msg[0] === "/disableStudioMode"){
        obs.send("DisableStudioMode").catch((err) => {
            console.log(`ERROR: ${err.error}`);
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Toggle Studio Mode
    else if (msg[0] === "/toggleStudioMode"){
        obs.send("ToggleStudioMode").catch((err) => {
            console.log(err)
            logEverywhere(err)
        })
    
    } 
    //Triggers Source Visibility On/Off
    else if (msg[0].includes('visible')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var visible;
        if(msg[1] === 0 || msg[1] === 'off' || msg[1] === '0' || msg[1] === 'false'){
            visible = false
        } else if(msg[1] === 1 || msg[1] === 'on' || msg[1] === '1' || msg[1] === 'true'){
            visible = true
        }
        obs.send("SetSceneItemProperties", {
            'scene-name': msgArray[0].split('_').join(' ').toString(),
            'item': msgArray[1].split('_').join(' ').toString(),
            'visible': visible,
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")
            logEverywhere("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")

        })
    } 
    //Triggers Filter Visibility On/Off
    else if (msg[0].includes('filterVisibility')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var visiblef;
        if(msg[1] === 0 || msg[1] === 'off' || msg[1] === '0' || msg[1] === 'false'){
            visiblef = false
        } else if(msg[1] === 1 || msg[1] === 'on' || msg[1] === '1' || msg[1] === 'true'){
            visiblef = true
        }
        obs.send("SetSourceFilterVisibility", {
            'sourceName': msgArray[0].split('_').join(' '),
            'filterName': msgArray[1].split('_').join(' '),
            'filterEnabled': visiblef
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Source Name and Filter name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")
            logEverywhere("Error: Invalid Syntax. Make Sure There Are NO SPACES in Source Name and Filter name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")

        })
    }
    //SetTextFreetype2 Text
    else if (msg[0].includes('setText')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log(msgArray[0])
        console.log(msg[1]);
        obs.send("SetTextFreetype2Properties", {
            'source': msgArray[0].split('_').join(' '),
            'text': msg[1].toString(),
            'font': {
                size: msg[2],
                face: msg[3]
            }
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Source Name and Filter name. [Source_Name]/setText [string], example: /text1/setText 'new text who dis?'")
            logEverywhere("Error: Invalid Syntax. Make Sure There Are NO SPACES in Source Name and Filter name. [Source_Name]/setText [string], example: /text1/setText 'new text who dis?'")

        })
    }
    //Triggers the Source Opacity (via Filter > Color Correction)
    else if (msg[0].includes('opacity')){
        console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
        logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetSourceFilterSettings", {
           'sourceName': msgArray[0].split('_').join(' '),
           'filterName': msgArray[1].split('_').join(' '),
           'filterSettings': {'opacity' : parseInt(msg[1])}
        }).catch(() => {
            console.log("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")
            logEverywhere("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")

        })  
    }
    //Adjsuts the Source's Gamma via Color Correction Filter
    else if (msg[0].includes('/gamma')){
        console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
        logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetSourceFilterSettings", {
           'sourceName': msgArray[0].split('_').join(' '),
           'filterName': msgArray[1].split('_').join(' '),
           'filterSettings': { 'gamma' : parseFloat(msg[1]) }
        }).catch(() => {
            console.log("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")
            logEverywhere("ERROR: Gamma Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")

        })  
    }
    //Adjsuts the Source's Contrast via Color Correction Filter
    else if (msg[0].includes('/contrast')){
        console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
        logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetSourceFilterSettings", {
            'sourceName': msgArray[0].split('_').join(' '),
            'filterName': msgArray[1].split('_').join(' '),
            'filterSettings': { 'contrast' : parseFloat(msg[1]) }
        }).catch(() => {
            console.log("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")
            logEverywhere("ERROR: Contrast Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")

        })  
    }
    //Adjsuts the Source's Brightness via Color Correction Filter
    else if (msg[0].includes('/brightness')){
        console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
        logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetSourceFilterSettings", {
            'sourceName': msgArray[0].split('_').join(' '),
            'filterName': msgArray[1].split('_').join(' '),
            'filterSettings': { 'brightness' : parseFloat(msg[1]) }
        }).catch(() => {
            console.log("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")
            logEverywhere("ERROR: Brightness Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")

        })  
    }
    //Adjsuts the Source's Saturation via Color Correction Filter
    else if (msg[0].includes('/saturation')){
        console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
        logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetSourceFilterSettings", {
            'sourceName': msgArray[0].split('_').join(' '),
            'filterName': msgArray[1].split('_').join(' '),
            'filterSettings': { 'saturation' : parseFloat(msg[1]) }
        }).catch(() => {
            console.log("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")
            logEverywhere("ERROR: Saturation Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")

        })  
    }
    //Adjsuts the Source's Hue Shift via Color Correction Filter
    else if (msg[0].includes('/hueShift')){
        console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
        logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetSourceFilterSettings", {
            'sourceName': msgArray[0].split('_').join(' '),
            'filterName': msgArray[1].split('_').join(' '),
            'filterSettings': { 'hue_shift' : parseFloat(msg[1]) }
        }).catch(() => {
            console.log("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")
            logEverywhere("ERROR: Hue Shift Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")

        })  
    }
    //Set Transition Type and Duration
    else if (msg[0].includes('/transition')){
            console.log(`OSC IN: ${msg}`)
            //logEverywhere(`OSC IN: ${msg}`)
            var msgArray = msg[0].split("/")
            msgArray.shift()
        if (msgArray[0] === "Cut" || msgArray[0] === "Stinger") {
            console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
            logEverywhere(`OSC IN: ${msg}`)
            obs.send("SetCurrentTransition", {
                'transition-name': msgArray[0].toString()
            }).catch(() => {
                console.log("Whoops")
                logEverywhere("Error: Transition Syntax Error. See Help > API")
            })
        } else {
            if (msg[1] == undefined){
                obs.send("GetTransitionDuration").then(data => {
                    var tranisionTime = data["transition-duration"]
                    console.log(`OSC IN: ${msg[0]} ${msg[1]}\nCurrent Duration: ${tranisionTime}`)
                    logEverywhere(`OSC IN: ${msg[0]}\nCurrent Duration: ${tranisionTime}`)
                })
            } else {
            console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
            logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
            }
            var makeSpace = msgArray[0].split('_').join(' ');
            obs.send("SetCurrentTransition", {
                'transition-name': makeSpace.toString()
            }) 
        if(msg.length === 2){
        obs.send("SetTransitionDuration", {
            'duration': msg[1]
        })
    } else if (msg.length === 1) {
        return
    } else {
            console.log("ERROR: Invalid Transition Name. It's Case Sensitive. Or if it contains SPACES use '_' instead")
            logEverywhere("ERROR: Invalid Transition Name. See Help > API")
            } 
        }
    }
    //Source Position Translate
    else if (msg[0].includes('position')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var x = msg[1] + 960
        var y = msg[2] - (msg[2] * 2)
        obs.send("SetSceneItemProperties", {
            'scene-name': msgArray[0].toString().split('_').join(' '),
            'item': msgArray[1].toString().split('_').join(' '),
            'position': { 'x': x, 'y': y + 540}
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalid Position Name. See Help > API")
        })
    }
    //Source Scale Translate
    else if (msg[0].includes('scale')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var visible;
        obs.send("SetSceneItemProperties", {
            'scene-name': msgArray[0].split('_').join(' ').toString(),
            'item': msgArray[1].split('_').join(' ').toString(),
            'scale': { 'x': msg[1], 'y': msg[1]}
        }).catch(() => {
            console.log("Error: Invalid Scale Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")
            logEverywhere("ERROR: Invalid Scale Syntax. See Help > API")
        })
    } 
    //Source Rotation Translate
    else if (msg[0].includes('rotate')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetSceneItemProperties", {
            'scene-name': msgArray[0].split('_').join(' ').toString(),
            'item': msgArray[1].split('_').join(' ').toString(),
            'rotation': msg[1]
        }).catch(() => {
            console.log("Error: Invalid Rotation Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/rotate 0 or 1, example: /Wide/VOX/rotate 1")
            logEverywhere("Error: Invalid Rotation Syntax. See Help > API")
        })
    }
    //Triggers Source UnMute
    else if (msg[0].includes('unmute')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetMute", {
            'source': msgArray[0].split('_').join(' ').toString(),
            'mute': false,
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mute 0 or 1, example: /Audio/mute 1")
            logEverywhere("ERROR: Invalid Unmute Syntax. See Help > API")
        })
    }
    //Triggers Source Mute
    else if (msg[0].includes('mute')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetMute", {
            'source': msgArray[0].split('_').join(' ').toString(),
            'mute': true,
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mute 0 or 1, example: /Audio/mute 1")
            logEverywhere("ERROR: Invalid Mute Syntax. See Help > API")
        })
    }
    //Adjust Source Volume
    else if (msg[0].includes('volume')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetVolume", {
            'source': msgArray[0].split('_').join(' ').toString(),
            'volume': msg[1],
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/volume 0-1, example: /Audio/volume 1")
            logEverywhere("ERROR: Invalid Volume Syntax. See Help > API")

        })
    }
    //Set Sources Audio Monitor Off
    else if (msg[0].includes('monitorOff')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log(msgArray[0])
        obs.send("SetAudioMonitorType", {
            'sourceName': msgArray[0].split('_').join(' ').toString(),
            'monitorType': "none",
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/volume 0-1, example: /Audio/volume 1")
            logEverywhere("ERROR: Invalid Monitor Off Syntax. See Help > API")

        })
    }
    //Set Sources Audio Monitor Only
    else if (msg[0].includes('monitorOnly')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log(msgArray[0])
        obs.send("SetAudioMonitorType", {
            'sourceName': msgArray[0].split('_').join(' ').toString(),
            'monitorType': "monitorOnly",
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/volume 0-1, example: /Audio/volume 1")
            logEverywhere("ERROR: Invalid Monitor Only Syntax. See Help > API")

        })
    }
    //Set Sources Audio MonitorandOutput
    else if (msg[0].includes('monitorAndOutput')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log(msgArray[0])
        obs.send("SetAudioMonitorType", {
            'sourceName': msgArray[0].split('_').join(' ').toString(),
            'monitorType': "monitorAndOutput",
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/volume 0-1, example: /Audio/volume 1")
            logEverywhere("ERROR: Invalid Monitor and Output Syntax. See Help > API")

        })
    }
    //Open Projector
    else if (msg[0].includes('openProjector')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("OpenProjector", {
            'type': msgArray[0].split('_').join(' ').toString(),
            'monitor': msg[1],
            'name': msg[2]
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaPlay, example: /Media_Source/mediaPlay")
            logEverywhere("ERROR: Invalid Open Projector Syntax. See Help > API")

        })
    }
    //Media Play
    else if (msg[0].includes('mediaPlay')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("PlayPauseMedia", {
            'sourceName': msgArray[0].split('_').join(' ').toString(),
            'playPause': false,
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaPlay, example: /Media_Source/mediaPlay")
            logEverywhere("ERROR: Invalid Media Play Syntax. See Help > API")

        })
    }
    //Media Pause
    else if (msg[0].includes('mediaPause')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("PlayPauseMedia", {
            'sourceName': msgArray[0].split('_').join(' ').toString(),
            'playPause': true,
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaPause, example: /Media_Source/mediaPause")
            logEverywhere("ERROR: Invalid Media Pause Syntax. See Help > API")

        })
    }
    //Media Restart
    else if (msg[0].includes('mediaRestart')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("RestartMedia", {
            'sourceName': msgArray[0].split('_').join(' ').toString()
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaRestart, example: /Media_Source/mediaRestart")
            logEverywhere("ERROR: Invalid Media Restart Syntax. See Help > API")

        })
    }
    //Media Stop
    else if (msg[0].includes('mediaStop')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("StopMedia", {
            'sourceName': msgArray[0].split('_').join(' ').toString()
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaStop, example: /Media_Source/mediaStop")
            logEverywhere("ERROR: Invalid Media Stop Syntax. See Help > API")

        })
    }
    //Media Stop
    else if (msg[0].includes('refreshBrowser')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("RefreshBrowserSource", {
            'sourceName': msgArray[0].split('_').join(' ').toString()
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaStop, example: /Media_Source/mediaStop")
            logEverywhere("ERROR: Invalid Refresh Browser Syntax. See Help > API")

        })
    }
    //Set Source Collection
    else if (msg[0] === "/setSceneCollection"){
        obs.send("SetCurrentSceneCollection", {
            'sc-name': msg[1].toString()
        }).catch(() => {
            logEverywhere("ERROR: Invalid) Refresh Browser Syntax. See Help > API")
        })
    }
    //Set Profile
    else if (msg[0] === "/setProfile"){
        obs.send("SetCurrentProfile", {
            'profile-name': msg[1].toString()
        }).catch(() => {
            logEverywhere("ERROR: Invalid) Refresh Browser Syntax. See Help > API")
        })
    }


    // ----- TouchOSC COMMANDS: ------
    else if (msg[0] === '/logAllSceneItems'){
        return obs.send("GetSceneList").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        logEverywhere("--- Available Scene Items: ---")
        // logEverywhere(data.name)
        // logEverywhere(msg[1])
        data.scenes.forEach(i => {
            obs.send("GetSceneItemList", {
                'sceneName': i.name,
            }).then(data => {
                data.sceneItems.forEach(j => {
                    console.log(j)
                    logEverywhere(j.sourceName)
                })
            }).catch(() => {
                console.log("ERROR: Invalis Position Syntax")
                logEverywhere("ERROR: Invalid Log Scene Items Syntax. See Help > API")
            })
        })

    })
    }
    //Source Position Select Move
    else if (msg[0] === '/addSceneItem'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        // logEverywhere(data.name)
        // logEverywhere(msg[1])
        obs.send("AddSceneItem", {
            'sceneName': data.name,
            'sourceName': msg[1].toString(),
            'setVisible': true
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalid Add Scene Item Syntax. See Help > API")
        })
    })
    }
    //Source Position Select Move
    else if (msg[0] === '/move'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var x = Math.floor((msg[2]*2000))
        var y = Math.floor((msg[1]*2000) + 960)
        console.log(x + " " + y)
        logEverywhere(x + " " + y)
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name,
            'item': currentSceneItem,
            'position': { 'x': x + 540, 'y': y, 'alignment': 0}
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalid Move Syntax. See Help > API")
        })
    })
    }
    //Source Position Select MoveX
    else if (msg[0] === '/movex'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var x = Math.floor((msg[1]*2000))
        var y = Math.floor((msg[1]*2000) + 960)
        console.log(x + " " + y)
        logEverywhere(x + " " + y)
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name,
            'item': currentSceneItem,
            'position': { 'x': x + 540, 'alignment': 0}
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalid Move X Syntax. See Help > API")
        })
    })
    }
    //Source Position Select MoveY
    else if (msg[0] === '/movey'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var x = Math.floor((msg[2]*2000))
        var y = Math.floor((msg[1]*2000) + 960)
        console.log(x + " " + y)
        logEverywhere(x + " " + y)
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name,
            'item': currentSceneItem,
            'position': { 'y': y, 'alignment': 0}
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalid Move Y Syntax. See Help > API")
        })
    })
    } 
    //Source Align
    else if (msg[0] === '/align'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        console.log("Scene NAme: " + data.name)
        console.log("Scene NAme: " + currentSceneItem)
        var x = 0 + 960
        var y = 0 + 540
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name.toString(),
            'item': currentSceneItem,
            'position': {'x': x, 'y': y, 'alignment': msg[1]}
        }).catch(() => {
            console.log("Error: Select A Scene Item in OBS for Alignment")
            logEverywhere("ERROR: Invalid Alignment Syntax. See Help > API")
        })
    })
    }
    //Set Transition Override
    else if(msg[0].includes('/transOverrideType')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log("Messge array: " + msgArray)
        //logEverywhere("Messge array: " + msgArray)
        return obs.send("GetCurrentScene").then(data => {
        obs.send("SetSceneTransitionOverride", {
            'sceneName': data.name,
            'transitionName': msgArray[1].split('_').join(' ').toString(),
        }).catch(() => {
            logEverywhere("ERROR: Invalid Transition Override Type Syntax. See Help > API")
        })
    })
    }
    //Set Transition Override
    else if(msg[0] === '/transOverrideDuration'){
        let currentSceneName
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        return obs.send("GetCurrentScene").then(data => {
            currentSceneName = data.name
        return obs.send("GetSceneTransitionOverride", {
            'sceneName': currentSceneName
        }).then(data => {
            obs.send("SetSceneTransitionOverride", {
                'sceneName': currentSceneName,
                'transitionName': data.transitionName,
                'transitionDuration': Math.floor(msg[1])
            })
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalid Transition Override Duration Syntax. See Help > API")
        })
    })
    }
    //Source Size
    else if (msg[0] === '/size'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name.toString(),
            'item': currentSceneItem,
            'scale': {'x': msg[1], 'y': msg[1]}
        }).catch(() => {
            console.log("Error: Select A Scene Item in OBS for Size")
            logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
        })
    })
    }
    //Fit to Screen
    else if (msg[0] === '/fitToScreen'){
            return obs.send("GetCurrentScene").then(data => {
                console.log(`OSC IN: ${msg}`)
                logEverywhere(`OSC IN: ${msg}`)
                let currentScene = data
            obs.send("GetVideoInfo").then(data => {
    
                obs.send("SetSceneItemProperties", {
                "scene-name": currentScene.name.toString(),
                item: {
                    name: currentSceneItem.toString(),
                },
                position: {
                    x: 0,
                    y: 0
                },
                bounds: {
                   type: "OBS_BOUNDS_SCALE_INNER",
                   x: data.baseWidth,
                   y: data.baseHeight
                }
            }).catch(() => {
                console.log("Error: Select A Scene Item in OBS for Size")
                logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
            })
            
            }).catch(() => {
                console.log("Error: Select A Scene Item in OBS for Size")
                logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
            })
        }).catch(() => {
            console.log("Error: Select A Scene Item in OBS for Size")
            logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
        })
    }
    //Duplicate Current Scene
    else if (msg[0] === '/duplicateCurrentScene'){
        return obs.send("GetCurrentScene").then(data => {
            console.log(`OSC IN: ${msg}`)
            logEverywhere(`OSC IN: ${msg}`)
            let currentScene = data
            console.log(currentScene)
            console.log(currentScene.sources[0].name)
                obs.send("CreateScene", {
                    sceneName: `${currentScene.name} 2`
                }).then(() => {
                    currentScene.sources.forEach(item => {
                        obs.send("DuplicateSceneItem", {
                         fromScene: currentScene.name,
                         toScene: `${currentScene.name} 2`,
                         item: {
                             name: item.name,
                             id: item.id
                         }
                        })
                    })
                }).catch((err) => {
                    console.log(err)
                    if (err.error === "scene with this name already exists"){
                        obs.send("CreateScene", {
                            sceneName: `${currentScene.name} 2 3`
                        }).then(() => {
                            currentScene.sources.forEach(item => {
                                obs.send("DuplicateSceneItem", {
                                 fromScene: currentScene.name,
                                 toScene: `${currentScene.name} 2 3`,
                                 item: {
                                     name: item.name,
                                     id: item.id
                                 }
                                })
                            })
                        }).catch(()=>{console.log("Same Name")})
                    }
                    console.log("Error: Select A Scene Item in OBS for Size")
            })
        }).catch(() => {
            console.log("Error: Select A Scene Item in OBS for Size")
            logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
        })
    }
    //Log Error
    else {
        console.log("Error: Invalid OSC command. Please refer to Node OBSosc on Github for Command List")
        logEverywhere("Error: Invalid OSC command. Please refer to OBSosc OSC Command List in 'Help' > 'API'")
    }
});

//OBS -> OSC Client (OUT)
obs.on('TransitionBegin', data => {
    if(enableObs2App === "false"){
        enableObs2App = false
    } else if(enableObs2App === "true"){
        enableObs2App = true
    }
    logEverywhere(`New Active Scene: ${data['to-scene']}`)
    if (enableObs2App){
    client.send(`${oscOutPrefix}${data['to-scene'].split(' ').join('_').toString()}${oscOutSuffix}`, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
        if (err) console.error(err);
            });
        }
    })


//
//AutoCropper Code
//

    function calcDimensionsForShape(frameWidth, frameHeight, boxCount, aspectRatio, spacing, rows, cols) {
        // pack the frames together by removing the spacing between them
        const packedWidth = frameWidth - (spacing * (cols - 1));
        const packedHeight = frameHeight - (spacing * (rows - 1));
        const hScale = packedWidth / (cols * aspectRatio);
        const vScale = packedHeight / rows;
        let width;
        let height;
        if (hScale <= vScale) {
            width = Math.floor(packedWidth / cols / 16) * 16;
            height = Math.floor(width / aspectRatio / 9) * 9;
        } else {
            height = Math.floor(packedHeight / rows / 9) * 9;
            width = Math.floor(height * aspectRatio / 16) * 16;
        }
        const area = width * height;
        return {
            area: area,
            cols: cols,
            rows: rows,
            width: width,
            height: height
        };
    }
    
    /**
     * Calculate optimal layout (most area used) of a number of boxes within a larger frame.
     * Given number of boxes, aspectRatio of those boxes, and spacing between them.
     *
     * Thanks to Anton Dosov for algorithm shown in this article:
     * https://dev.to/antondosov/building-a-video-gallery-just-like-in-zoom-4mam
     *
     * @param frameWidth width of the space holding the boxes
     * @param frameHeight height of the space holding the boxes
     * @param boxCount number of boxes to place (all same aspect ratio)
     * @param aspectRatio ratio of width to height of the boxes (usually 16/9)
     * @param spacing amount of space (margin) between boxes to spread them out
     * @returns A description of the optimal layout
     */
    function calcOptimalBoxes(frameWidth,
                              frameHeight,
                              boxCount,
                              aspectRatio,
                              spacing,
                              galRows,
                              galCols) {
    
        // keep track of the one with the biggest area, biggest is the best
        let bestLayout = {
            area: 0,
            cols: 0,
            rows: 0,
            width: 0,
            height: 0
        }
    
        if (galRows > 0 && galCols > 0) {
            // we already know rows/cols, we don't need to try all combinations
            return calcDimensionsForShape(frameWidth, frameHeight, boxCount, aspectRatio, spacing, galRows, galCols);
        }
    
        // try each possible number of columns to find the one with the highest area (optimum use of space)
        for (let cols = 1; cols <= boxCount; cols++) {
            const rows = Math.ceil(boxCount / cols);
            const layout = calcDimensionsForShape(frameWidth, frameHeight, boxCount, aspectRatio, spacing, rows, cols);
            if (layout.area > bestLayout.area) {
                bestLayout = layout;
            }
        }
        return bestLayout;
    }
    
    /**
     * Calculate crop values for the gallery boxes given the overall frame size and number of boxes in the gallary
     *
     * @param sourceWidth Width of the enclosing frame
     * @param sourceHeight Height of the enclosing frame
     * @param itemCount Number of boxes to lay out
     * @returns an array of crop values for a bunch of zoom boxes
     */
     function autoCropZoomGallery(sourceWidth, sourceHeight, itemCount, cropName, multiplier, galRows, galCols, topMarginOverride, bottomMarginOverride) {
        const ASPECTRATIO = 16 / 9;
        const TOPMARGIN = (topMarginOverride && topMarginOverride >= 0) ? topMarginOverride : 45;
        const BOTTOMMARGIN = (bottomMarginOverride && topMarginOverride >= 0) ? bottomMarginOverride : 59;
        const LEFTMARGIN = RIGHTMARGIN = 6;
        const SPACING = 6;
        // these work for me ymmv
        const topMargin = TOPMARGIN * multiplier;
        const bottomMargin = BOTTOMMARGIN * multiplier;
        const spacing = SPACING * multiplier;
        let leftMargin = rightMargin = LEFTMARGIN * multiplier;
    
        // make this zero if you don't want to crop out the name
        // if you want to be really cool about it, add boolean param like "crop name"
        const nameLabelHeight = (cropName ? 20 : 0) * multiplier;
    
        let centerV = (sourceHeight - topMargin - bottomMargin) / 2 + topMargin;
    
        // width excluding margins
        const innerWidth = sourceWidth - leftMargin - rightMargin;
        const innerHeight = sourceHeight - topMargin - bottomMargin;
    
        let bestLayout = calcOptimalBoxes(innerWidth, innerHeight, itemCount, ASPECTRATIO, spacing, galRows, galCols);
    
        const numCols = bestLayout.cols;
        const numRows = bestLayout.rows;
        const boxWidth = bestLayout.width;
        const boxHeight = bestLayout.height;
    
        console.log("width="+boxWidth+ ", height="+boxHeight+", rows="+numRows);
        console.log('\n');
    
        // last row might not be full
        const lastRow = numRows - 1;
        const lastRowCols = numCols - (numRows * numCols - itemCount);
    
        const result = [];
    
        // figure out crop for each item
        for (let i = 0; i < itemCount; i++) {
            const colInd = i % numCols;
            const rowInd = Math.floor(i / numCols);
            const rowSize = (rowInd === lastRow) ? lastRowCols : numCols;
    
            const boxWidthSum = rowSize * boxWidth + (spacing * (rowSize - 1))
            const boxHeightSum = numRows * boxHeight + (spacing * (numRows - 1))
    
            const hMargin = (sourceWidth - boxWidthSum) / 2;
    
            const cropLeft = hMargin + (colInd * boxWidth) + (colInd * spacing);
            const cropRight = sourceWidth - (cropLeft + boxWidth);
    
            const cropTop = Math.round(centerV - boxHeightSum / 2) + (rowInd * (boxHeight + spacing));
            const cropBottom = sourceHeight - (cropTop + boxHeight) + nameLabelHeight;
    
            console.log("crop "+i+": cropLeft="+cropLeft+", cropRight="+cropRight+", cropTop="+cropTop+", cropBottom="+cropBottom);
            console.log('\n');
    
            result.push({
                left: cropLeft,
                right: cropRight,
                top: cropTop,
                bottom: cropBottom
            });
        }
    
        return result;
    }

    let galleryCount
    //On GalleryOrder Start AutoCropper
    serverZoom.on('message', (msg) => {
        console.log(msg)
    
        if(removeNames == "false"){
            removeNames = false
        } else if(removeNames == "true"){
            removeNames = true
        }
        setTimeout(() => { 
        if(msg[0] === "/zoomosc/galleryOrder"){
            console.log("This is msg length " + msg.length)
            galleryCount = msg.length - 1
            const autoCrop = autoCropZoomGallery(parseInt(screenWidth), parseInt(screenHeight), galleryCount, removeNames, parseInt(isRetina),0,0,0,0)
            // console.log(autoCrop)
            // console.log(autoCrop[1].left)
            msg.shift()
            let orderArray = msg
            logEverywhere("Gallery Order: " + orderArray)
            orderArray.forEach((i, index) => {
                console.log(i);
                console.log(index)
                obs.send("SetSceneItemProperties", {
                'scene-name': i.toString(),
                'item': `Display Capture ${i}`,
                'crop': { 'top': autoCrop[index].top, 'bottom': autoCrop[index].bottom, 'right': autoCrop[index].right, 'left': autoCrop[index].left },
            }).catch((err) => {console.log(err)})
            })
        }
    }, 0);
    
    })

    //Turns OFF and ON Sources Depending On Participants Zoom Status
serverZoom.on('message', (msg) => {
    if (msg[0] === "/zoomosc/vid/off" || msg[0] === "/zoomosc/video/off" || msg[0] === "/zoomosc/user/videoOff") {
        obs.send("SetSceneItemProperties", {
            'scene-name': msg[1].toString(),
            'item': `Display Capture ${msg[1]}`,
            'visible': false,
        }).catch((err) => {
            console.log(err)
        })
    } 
    else if (msg[0] === "/zoomosc/vid/on" || msg[0] === "/zoomosc/video/on" || msg[0] === "/zoomosc/user/videoOn"){
        setTimeout(() => {
        obs.send("SetSceneItemProperties", {
            'scene-name': msg[1].toString(),
            'item': `Display Capture ${msg[1]}`,
            'visible': true,
            }).catch((err) => {
                console.log(err)
            })
        }, 1000)
    } 
})















})
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
