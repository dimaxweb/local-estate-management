// server.ts
import bodyParser from 'body-parser';
import propertyService from './property.js';
// import agentService from './agent';
import express, { Request, Response } from 'express';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { Handler } from 'serverless-http';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// Property routes
// app.get('/properties', async (req, res) => {
//   const properties = await propertyService.getAllProperties();
//   res.json(properties);
// });

// app.get('/properties/:id', async (req, res) => {
//   const id = parseInt(req.params.id);
//   const property = await propertyService.getPropertyById(id);
//   if (property) {
//     res.json(property);
//   } else {
//     res.status(404).json({ error: 'Property not found' });
//   }
// });

// app.post('/properties', async (req, res) => {
//   const property = await propertyService.createProperty(req.body);
//   res.json(property);
// });

// app.put('/properties/:id', async (req, res) => {
//   const id = parseInt(req.params.id);
//   const updatedProperty = await propertyService.updateProperty(id, req.body);
//   if (updatedProperty) {
//     res.json(updatedProperty);
//   } else {
//     res.status(404).json({ error: 'Property not found' });
//   }
// });

// app.delete('/properties/:id', async (req, res) => {
//   const id = parseInt(req.params.id);
//   await propertyService.deleteProperty(id);
//   res.json({ message: 'Property deleted successfully' });
// });

app.get('/resize', async (req: Request, res: Response, next:any) => {
  const { width, height, imagePath } = req.query;

  if (!width || !height || !imagePath) {
     res.status(400).send('Missing required query parameters: width, height, imagePath');
  }
  const parsedWidth = parseInt(width as string, 10);
  const parsedHeight = parseInt(height as string, 10);
  const __dirname = path.resolve(path.dirname(''));
  const imageFullPath = path.resolve(__dirname, '.', imagePath as string);
  if (!fs.existsSync(imageFullPath)) {
     res.status(404).send('Image not found imageFullPath');
     next();
  }
  try {
    const resizedImageBuffer = await sharp(imageFullPath)
      .resize(parsedWidth, parsedHeight)
      .toBuffer();
    const extension = path.extname(imagePath as string).substring(1);
    res.set('Content-Type', extension);
    res.send(resizedImageBuffer);
  } catch (error: any) {
    throw new Error("Exception happened when resizing image", error);
  }
});

app.use((err:Error, req:Request, res:Response, next:any) => {
  console.error(err);
  res.status(500).send('Something broke!');
  next(err);
})

// Agent routes
// Similar to property routes, you can define routes for agents

export const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Press CTRL+C to stop the server`);
});



export default app;