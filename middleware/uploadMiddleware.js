import multer from "multer";

const upload = multer({storage: multer.diskStorage({})})

export default upload;

// roomRouter.post('/', upload.array("images",4), protect, createRoom)  