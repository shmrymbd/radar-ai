import { connectToDatabase } from './mongodb';
import { CameraConfig } from '@/types/camera';

/**
 * MongoDB storage for camera configurations
 * Provides persistent storage for camera settings across server restarts
 */
export class CameraStorage {
  private static instance: CameraStorage;
  private collectionName = 'camera_configs';

  public static getInstance(): CameraStorage {
    if (!CameraStorage.instance) {
      CameraStorage.instance = new CameraStorage();
    }
    return CameraStorage.instance;
  }

  private constructor() {}

  /**
   * Get all camera configurations
   */
  async getAllCameras(): Promise<CameraConfig[]> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection<CameraConfig>(this.collectionName);

      const cameras = await collection.find({}).sort({ createdAt: 1 }).toArray();

      return cameras.map(camera => ({
        ...camera,
        createdAt: new Date(camera.createdAt),
        updatedAt: new Date(camera.updatedAt)
      }));
    } catch (error) {
      console.error('Error fetching cameras from MongoDB:', error);
      return [];
    }
  }

  /**
   * Get camera by ID
   */
  async getCameraById(id: string): Promise<CameraConfig | null> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection<CameraConfig>(this.collectionName);

      const camera = await collection.findOne({ id });

      if (!camera) {
        return null;
      }

      return {
        ...camera,
        createdAt: new Date(camera.createdAt),
        updatedAt: new Date(camera.updatedAt)
      };
    } catch (error) {
      console.error(`Error fetching camera ${id} from MongoDB:`, error);
      return null;
    }
  }

  /**
   * Create new camera configuration
   */
  async createCamera(camera: CameraConfig): Promise<CameraConfig> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection<CameraConfig>(this.collectionName);

      // Ensure dates are proper Date objects
      const cameraData = {
        ...camera,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await collection.insertOne(cameraData as any);

      console.log(`✅ Camera created in MongoDB: ${camera.id} - ${camera.name}`);

      return cameraData;
    } catch (error) {
      console.error('Error creating camera in MongoDB:', error);
      throw new Error('Failed to create camera configuration');
    }
  }

  /**
   * Update camera configuration
   */
  async updateCamera(id: string, updates: Partial<CameraConfig>): Promise<CameraConfig | null> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection<CameraConfig>(this.collectionName);

      // Remove _id from updates if present
      const { ...updateData } = updates;

      const result = await collection.findOneAndUpdate(
        { id },
        {
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        console.warn(`Camera not found for update: ${id}`);
        return null;
      }

      console.log(`✅ Camera updated in MongoDB: ${id}`);

      return {
        ...result,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt)
      };
    } catch (error) {
      console.error(`Error updating camera ${id} in MongoDB:`, error);
      throw new Error('Failed to update camera configuration');
    }
  }

  /**
   * Delete camera configuration
   */
  async deleteCamera(id: string): Promise<boolean> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection<CameraConfig>(this.collectionName);

      const result = await collection.deleteOne({ id });

      if (result.deletedCount === 0) {
        console.warn(`Camera not found for deletion: ${id}`);
        return false;
      }

      console.log(`✅ Camera deleted from MongoDB: ${id}`);

      return true;
    } catch (error) {
      console.error(`Error deleting camera ${id} from MongoDB:`, error);
      throw new Error('Failed to delete camera configuration');
    }
  }

  /**
   * Get active cameras
   */
  async getActiveCameras(): Promise<CameraConfig[]> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection<CameraConfig>(this.collectionName);

      const cameras = await collection
        .find({ isActive: true })
        .sort({ createdAt: 1 })
        .toArray();

      return cameras.map(camera => ({
        ...camera,
        createdAt: new Date(camera.createdAt),
        updatedAt: new Date(camera.updatedAt)
      }));
    } catch (error) {
      console.error('Error fetching active cameras from MongoDB:', error);
      return [];
    }
  }

  /**
   * Toggle camera active status
   */
  async toggleCameraActive(id: string, isActive: boolean): Promise<boolean> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection<CameraConfig>(this.collectionName);

      const result = await collection.updateOne(
        { id },
        {
          $set: {
            isActive,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        console.warn(`Camera not found for active toggle: ${id}`);
        return false;
      }

      console.log(`✅ Camera active status toggled: ${id} -> ${isActive}`);

      return true;
    } catch (error) {
      console.error(`Error toggling camera active status ${id}:`, error);
      throw new Error('Failed to toggle camera active status');
    }
  }

  /**
   * Create indexes for camera collection
   */
  async createIndexes(): Promise<void> {
    try {
      const db = await connectToDatabase();
      const collection = db.collection(this.collectionName);

      // Index on camera ID (unique)
      await collection.createIndex({ id: 1 }, { unique: true });

      // Index on camera name for searching
      await collection.createIndex({ name: 1 });

      // Index on active status for filtering
      await collection.createIndex({ isActive: 1 });

      // Index on creation date for sorting
      await collection.createIndex({ createdAt: -1 });

      console.log('✅ Camera configuration indexes created successfully');
    } catch (error) {
      console.error('Error creating camera indexes:', error);
      throw error;
    }
  }
}

export default CameraStorage;
