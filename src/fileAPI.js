const extensions = ["png", "jpg", "jpeg", "gif", "webp", "svg", "mp3", "wav", "ogg", "m4a", "flac", "zip", "tar", "gz", "pdf", "ttf", "woff", "woff2"];
const isBinary = new RegExp(`\.(${extensions.join("|")})$`, "i");

async function unzip(file) {
    return new Promise((resolve, reject) => {
        readFormFile(file)
            .then(async data => resolve(JSZip.loadAsync(data)))
            .catch(reject)
    });
}

async function readLocalFile(filePath) {
    const response = await fetch(filePath);
    return await response.text();
}

async function readFormFile(element, index) {
    return new Promise((resolve, reject) => {
        let file = element.files[index || 0];
        if (typeof file !== "object" || file === null) { reject("no file found") }
        const reader = new FileReader();
        reader.onload = () => { resolve(reader.result) };
        reader.onerror = reject;
        reader[isBinary.test(file.name) ? "readAsArrayBuffer" : "readAsText"](file);
    })
}

async function getAllFiles(zip) {
    const files = {};
    for (const [filename, file] of Object.entries(zip.files)) {
        if (!file.dir) {
            files[filename] = await file.async(isBinary.test(filename) ? "uint8array" : "text");
        }
    }
    return files;
}

async function zip(folder, parrent) {
    const newZip = new JSZip();
    for (const [filename, content] of Object.entries(folder)) {
        newZip.file(filename, content);
    }
    const blob = await newZip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = parrent.slice(0, -1);
    link.click();
    URL.revokeObjectURL(url);
}

export {
    unzip,
    readLocalFile,
    readFormFile,
    getAllFiles,
    zip
}