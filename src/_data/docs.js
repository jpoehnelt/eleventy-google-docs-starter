/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const EleventyFetch = require("@11ty/eleventy-fetch");
const { JWT } = require("google-auth-library");
const slugify = require("@sindresorhus/slugify");
const Image = require("@11ty/eleventy-img");

// Setup authentication for Google Drive API using a service account. The Google
// Drive folder has been shared with this service account or is publicly
// accessible.
const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/gm, "\n"),
  scopes: [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/documents.readonly",
  ],
});

/**
 * Helper method for retrieving an access token
 *
 * @returns {Promise<string>} Access token
 */
const token = () => auth.getAccessToken().then(({ token }) => token);

/**
 * Fetches a Google Doc and returns the JSON representation
 *
 * @param {string} id Google Doc ID
 * @returns {Promise<any>} Google Doc JSON
 */
async function getDoc(id) {
  const url = `https://docs.googleapis.com/v1/documents/${id}`;

  return EleventyFetch(url, {
    duration: "1d",
    type: "json",
    fetchOptions: {
      headers: {
        Authorization: `Bearer ${await token()}`,
      },
    },
  });
}

/**
 * Returns a list of files and folders in a Google Drive folder recursively
 *
 * @typedef {{
 *        id: string,
 *        title: string,
 *        path: string,
 *        hast: any,
 *        html: string
 *    }} Doc
 * @param {string} parent Folder ID
 * @param {string} [tree] Path to folder
 * @returns {Promise<Doc[]>} List of Google Docs with additional transformations
 */
async function getChildren(parent, tree = []) {
  // Get all files in folder
  const q = encodeURIComponent(`'${parent}' in parents`);
  let url = `https://www.googleapis.com/drive/v3/files?q=${q}`;

  const item = await EleventyFetch(url, {
    duration: "1d",
    type: "json",
    fetchOptions: {
      headers: {
        Authorization: `Bearer ${await token()}`,
      },
    },
  });

  const files = await Promise.all(
    item.files
      .filter(
        (file) => file.mimeType === "application/vnd.google-apps.document"
      )
      .map((f) =>
        getDoc(f.id)
          .then(transformDoc)
          .then((doc) => ({
            ...doc,
            path: [...tree, f].map(({ name }) => slugify(name)).join("/"),
            tree,
          }))
      )
  );

  const folders = item.files.filter(
    (file) => file.mimeType === "application/vnd.google-apps.folder"
  );

  const nestedFiles = await Promise.all(
    folders.map((f) => getChildren(f.id, (tree = [...tree, f])))
  );

  return [...files, ...nestedFiles.flat()];
}

/**
 * Downloads Google Doc images and updates the src attribute.
 *
 * @param {{properties: { src: string}}} node HAST node
 * @returns {Promise<void>} Promise that resolves when the image is downloaded and the src attribute is updated
 * @see https://www.11ty.dev/docs/plugins/image/
 */
async function downloadImage(node) {
  const metadata = await Image(node.properties.src, {
    outputDir: "./_site/img",
    widths: [null],
  });

  node.properties.src = Object.values(metadata)[0][0].url;

  // Could also use `picture` element with `srcset` and `sizes` attributes
  // https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images
}

/**
 * Transforms a Google Doc to HAST and HTML.
 *
 * @param {any} doc Google Doc JSON
 * @returns {Promise<{id: string, title: string, hast: any, html: string}>} Google Doc with additional transformations
 */
async function transformDoc(doc) {
  // esm support, https://github.com/11ty/eleventy/issues/836
  const { toHast } = await import("@googleworkspace/google-docs-hast");
  const { toHtml } = await import("hast-util-to-html");
  const { visit } = await import("unist-util-visit");

  const hast = toHast(doc);

  // Need to download images and replace src with local path. `visit` does not
  // work with async functions so we track the promises and await later. This
  // works because we are not changing the structure of the tree in a way that
  // matters, just replacing the img src attribute.
  const visits = [];

  /**
   * Check if node is an img
   *
   * @param {*} node Hast node
   * @returns {boolean} Whether the node is an img
   */
  function isImg(node) {
    return node.tagName === "img";
  }

  visit(hast, isImg, (node) => {
    visits.push(downloadImage(node));
  });

  await Promise.all(visits);

  // Consider using Title and Subtitle as HTML title and description instead of
  // Document title
  const html = toHtml(hast);

  return {
    ...doc,
    hast,
    html,
  };
}

module.exports = async function () {
  // Download all files in Drive Folder recursively
  return await getChildren(process.env.GOOGLE_DRIVE_FOLDER);
};
