import { CONFIG } from './config.js'
import { drawClass, layerFilenameArrays, bckdClass} from './main.js'
import initCanvasFunctionality from './initCanvasFunctionality.js'
import createImage from './createImage.js'

const signIn = document.querySelector("#driveUpload")
const signOut = document.querySelector("#signout_button")

signIn.addEventListener("click", handleAuthClick);
signOut.addEventListener("click", handleSignoutClick);

/**
 * Cached Drive API access token, persisted in localStorage so the user isn't re-prompted every session until it expires.
 * @type {?string}
 */
export let accessToken = localStorage.getItem('accessToken') ?? null;  

/**
 * OAuth2 token client from Google Identity Services, initialized in {@link gisLoaded}.
 * @type {?Object}
 */
let tokenClient;

/**
 * Whether Google Identity Services has finished initializing.
 * @type {boolean}
 */
export let gisInited = false;

/**
 * Whether the Google Picker API has finished initializing.
 * @type {boolean}
 */
let pickerInited = false;

/**
 * Callback after Google Identity Services are loaded.
 */
export function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: CONFIG.SCOPES,
    callback: '', // defined later
  });
  gisInited = true;
  maybeEnableButtons();
}

/**
 * Callback after api.js is loaded.
 */
export function gapiLoaded() {
  gapi.load('client:picker', initializePicker);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializePicker() {
  await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
  pickerInited = true;
  maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
export function maybeEnableButtons() {
  if (pickerInited && gisInited) {
    document.getElementById('driveUpload').style.visibility = 'visible';
  }
}

/**
 *  Sign in the user upon button click.
 */
export function handleAuthClick() {
  tokenClient.callback = async (response) => {
    if (response.error !== undefined) {s
      throw (response);
    }
    accessToken = response.access_token;
    localStorage.setItem('accessToken', accessToken);
    document.getElementById('driveUpload').innerHTML = '<img src="icons/export.png" alt="Upload" style="height: 16px;">';
    document.getElementById('signout_button').disabled = false;
    await createPicker();
  };

  if (accessToken === null) {
    // Prompt the user to select a Google Account and ask for consent to share their data
    // when establishing a new session.
    tokenClient.requestAccessToken({prompt: 'consent'});
  } else {
    // Skip display of account chooser and consent dialog for an existing session.
    tokenClient.requestAccessToken({prompt: ''});
  }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken);
    accessToken = null;
    document.getElementById('driveUpload').innerText = 'Sign In';
    document.getElementById('signout_button').style.visibility = 'hidden';
  }
}

/**
 *  Create and render a Google Picker object for searching images.
 */
function createPicker() {
  const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
  .setMimeTypes('image/png,image/jpeg,image/jpg')
  .setIncludeFolders(true)        // shows folders for navigation
  .setSelectFolderEnabled(false)
  .setParent('root')
  const sharedView = new google.picker.DocsView(google.picker.ViewId.DOCS)
  .setMimeTypes('image/png,image/jpeg,image/jpg')
  .setIncludeFolders(true)
  .setSelectFolderEnabled(false)
  .setOwnedByMe(false)
  const picker = new google.picker.PickerBuilder()
      //.enableFeature(google.picker.Feature.NAV_HIDDEN)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setDeveloperKey(CONFIG.API_KEY)
      .setAppId(CONFIG.APP_ID)
      .setOAuthToken(accessToken)
      .addView(view)
      .addView(sharedView)
      .addView(new google.picker.DocsUploadView())
      .setCallback(pickerCallback)
      .build();
  picker.setVisible(true);
}

/**
 * Callback once the user has picked file(s) in the Google Picker.
 * Converts each picked doc into an Image (via {@link createImage}),
 * sorts them by filename, and either initializes the canvases for the
 * first time this session ({@link initCanvasFunctionality}) or adds them
 * as a new layer ({@link BckdCanvasClass#addLayer}). If adding a layer
 * fails because the frame count doesn't match, reopens the picker so the
 * user can pick a matching set.
 * @param {Object} pickerResp - Google Picker response object.
 */
async function pickerCallback(pickerResp) {
  // await htmlReadyPromise;
  if (pickerResp.action === google.picker.Action.PICKED) {
    const docs = Array.from(pickerResp.docs);
    const results = await Promise.all(docs.map(createImage));
    results.sort((a, b) => a.name.localeCompare(b.name));

    // Extract just the images into the global array
    const images = results.map(r => r.image);
    const filenames = results.map(r => r.name);

    if (!drawClass) {
      layerFilenameArrays.push(filenames);
      initCanvasFunctionality(images, filenames[0]);
      document.getElementById('driveUpload').innerHTML = '<img src="icons/plus.png" alt="Upload" style="height: 16px;">';
    }
    else {
      try {
        bckdClass.addLayer(images, filenames[0]);
        layerFilenameArrays.push(filenames);
      }
      catch {
        createPicker();
      }
    }
  }
}