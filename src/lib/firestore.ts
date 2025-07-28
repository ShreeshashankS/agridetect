
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy, type Timestamp } from 'firebase/firestore';
import type { DiagnoseDiseaseOutput } from '@/ai/flows/diagnose-disease';

export interface PlantData {
    plantName?: string;
    latinName?: string;
    imageDataUri: string;
    diagnosis: DiagnoseDiseaseOutput | null;
}

export interface SavedPlant extends PlantData {
    id: string;
    userId: string;
    savedAt: Timestamp;
}

export async function savePlant(userId: string, plantData: PlantData) {
    try {
        await addDoc(collection(db, 'users', userId, 'plants'), {
            ...plantData,
            savedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error saving plant to Firestore: ", error);
        throw new Error("Could not save plant.");
    }
}

export async function getSavedPlants(userId: string): Promise<SavedPlant[]> {
    try {
        const plantsRef = collection(db, 'users', userId, 'plants');
        const q = query(plantsRef, orderBy('savedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const plants: SavedPlant[] = [];
        querySnapshot.forEach((doc) => {
            plants.push({
                id: doc.id,
                userId: userId,
                ...(doc.data() as Omit<SavedPlant, 'id' | 'userId'>)
            });
        });
        return plants;
    } catch (error) {
        console.error("Error getting saved plants from Firestore: ", error);
        throw new Error("Could not retrieve plants.");
    }
}
