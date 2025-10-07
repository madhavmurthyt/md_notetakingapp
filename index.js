import express from 'express';
import writeGood from 'write-good';
import multer from 'multer';
import path from 'path';
import { marked } from 'marked';

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
const app = express();
const PORT = 3099;
app.use(express.json());


const upload = multer({dest: 'uploads/' });
// Route to serve the main HTML file
app.post('/api/grammer-check', upload.single('markdownFile'), async(req, res) => {
    
    if(!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    if(!req.file.originalname.endsWith('.md')) {
         return res.status(500).json({ error: 'Only markdown (.md) files are allowed' });
    }
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

const NOTES_DIR = path.join(__dirname, 'data');
const METADATA_FILE = path.join(NOTES_DIR, 'metadata.json');
async function initialize() {
    const fs = await import('fs/promises');
    try {
        await fs.mkdir(NOTES_DIR, { recursive: true });
        try {
            await fs.access(METADATA_FILE);
        } catch {
            await fs.writeFile(METADATA_FILE, JSON.stringify([]));
        }
    } catch (error) {
        console.error('Error initializing notes directory:', error);
    }
}
initialize();


app.post('/api/notes', upload.single('markdownFile'), async (req, res) => {
    
    try {
    
            if(!req.file) { 
                return res.status(400).json({ error: 'No file uploaded' });
            }

            if(!req.file.originalname.endsWith('.md')) {
                return res.status(500).json({ error: 'Only markdown (.md) files are allowed' });
            }

            const id = uuidv4();
            const filePath = path.join(__dirname, req.file.path);
            const content = await fs.readFile(filePath, 'utf-8');

            if(!content.trim()) {
                await fs.unlink(filePath);
                return res.status(400).json({ error: 'Uploaded File is empty' });
            }
             const newFilePath = path.join(NOTES_DIR, `${id}.md`);
             await fs.writeFile(newFilePath, content);

            const metadata = JSON.parse(await fs.readFile(METADATA_FILE, 'utf-8'));
            const noteMetaData = {
                id,
                title: req.body.title && typeof req.body.title === 'string' ? req.body.title : req.file.originalname || 'Untitled Note',
                createdAt: new Date().toISOString()
            };
            metadata.push(noteMetaData);
            await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
            
            
                res.status(201).json({
                    id,
                    message: 'Note saved successfully'
                    });

    } catch (error) {
        console.error('Error saving note:', error);
        if (req.file) {
            await fs.unlink(path.join(__dirname, req.file.path)).catch(() => {}); // Clean up on error
            }
        return res.status(500).json({ error: 'Error saving note' });
        
    }
});

app.get('/api/notes', async (req, res) => {
    try {
        const metadata = JSON.parse(await fs.readFile(METADATA_FILE, 'utf-8'));
        res.json(metadata);
    } catch (error) {
        console.error('Error fetching notes metadata:', error);
        res.status(500).json({ error: 'Error fetching notes metadata' });
    }
});

app.get('/api/notes/:id/html', async (req, res) => {
    try {
        const metadata = JSON.parse(await fs.readFile(METADATA_FILE, 'utf-8'));
        const note = metadata.find(n => n.id === req.params.id);
        const id = req.params.id;
        
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        const filePath = path.join(NOTES_DIR, `${id}.md`);
        try {
            await fs.access(filePath); // Check if file exists
        } catch {
            return res.status(404).json({ error: 'Note file not found' });
        }

        const content = await fs.readFile(filePath, 'utf-8');
        const html = marked(content);
       
        res.json({
            html, 
            message: 'Note rendered successfully'
        });

    } catch (error) {
        console.error('Error rendering note content:', error);
        res.status(500).json({ error: 'Error fetching note content' });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});