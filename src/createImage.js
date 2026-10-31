import { accessToken } from './auth.js'

/**
 * Creates an `Image` object from a Google Drive file. Fetches the file
 * as binary data via the Drive API, converts it to a Blob, and loads
 * that Blob into an Image element.
 * @param {{id: string, name: string, mimeType: string}} file - A Drive Picker doc result.
 * @returns {Promise<{image: HTMLImageElement, name: string}>} Resolves once the image has loaded.
 */
export default async function createImage(file) {
  return new Promise((resolve, reject) => {
    gapi.client.drive.files
      .get({
        fileId: file.id,
        alt: 'media'
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
      .then(resp => {
        // console.log("status:", resp.status)
        let binary = resp.body
        let l = binary.length
        let array = new Uint8Array(l);
        for (var i = 0; i<l; i++){
          array[i] = binary.charCodeAt(i);
        }
        let blob = new Blob([array], {type: file.mimeType});
        let mySrc;
        const reader = new FileReader();
        reader.readAsDataURL(blob); 
        reader.onloadend = function() {
          // result includes identifier 'data:image/png;base64,' plus the base64 data
          const image = new Image(); 
          image.onload = () => resolve({image, name: file.name });
          image.onerror = reject;
          // console.log(reader.result.substring(0, 60))
          image.src = reader.result;
        }
      })
      .catch(err => {
        reject(err);
      })  
  });
}