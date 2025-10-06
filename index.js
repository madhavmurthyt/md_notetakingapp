import express from 'express';
import writeGood from 'write-good';
import multer from 'multer';

const app = express();
const PORT = 3099;
app.use(express.json());


const upload = multer({dest: 'uploads/' });
// Route to serve the main HTML file
app.post('/api/grammer-check', upload.single('markdown'), async(req, res) => {
    
    if(!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    if(!req.file.originalname.endsWith('.md')) {
         return res.status(500).json({ error: 'Only markdown (.md) files are allowed' });
    }
    const fs = await import('fs/promises');
    try {
           const content = await fs.readFile(req.file.path, 'utf-8');
           const result = writeGood(content);
           await fs.unlink(req.file.path); // Clean up the uploaded file
           return res.json(result);

    } catch (error) {
            return res.status(500).json({ error: 'Error processing file' });
    }
});

// api/notes shoudl accept multipart/form-data
// with fields filename and content
// save the content to a file named filename in data/ directory

app.post('/api/notes', upload.single('markdown'), async (req, res) => {
    if(!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    if(!req.file.originalname.endsWith('.md')) {
         return res.status(500).json({ error: 'Only markdown (.md) files are allowed' });
    }
    const fs = await import('fs/promises');
    
    try {
        await fs.rename(req.file.path, `data/${req.file.originalname}`);
        return res.json({ message: 'Note saved successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Error saving note' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});