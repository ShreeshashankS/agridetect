
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getSavedPlants, type SavedPlant } from '@/lib/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaf, LoaderCircle, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Garden() {
  const { user, loading } = useAuth();
  const [plants, setPlants] = useState<SavedPlant[]>([]);
  const [isLoadingPlants, setIsLoadingPlants] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchPlants = async () => {
        setIsLoadingPlants(true);
        const userPlants = await getSavedPlants(user.uid);
        setPlants(userPlants);
        setIsLoadingPlants(false);
      };
      fetchPlants();
    } else if (!loading) {
      setIsLoadingPlants(false);
    }
  }, [user, loading]);

  if (loading || isLoadingPlants) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoaderCircle className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-8">
            <Link href="/" className="flex items-center gap-2">
            <Leaf className="h-8 w-8 text-primary" />
            <h1 className="font-headline text-3xl font-bold text-primary">
                Agridetect
            </h1>
            </Link>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center text-center p-8">
            <User className="h-24 w-24 text-muted-foreground mb-4" />
            <h2 className="font-headline text-4xl font-bold mb-2">My Garden</h2>
            <p className="text-lg text-muted-foreground mb-6">Please log in to see your saved plants.</p>
            <Button asChild>
                <Link href="/">Back to Home</Link>
            </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Leaf className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-3xl font-bold text-primary">
            Agridetect
          </h1>
        </Link>
         <Button asChild variant="outline">
            <Link href="/">Diagnose a Plant</Link>
        </Button>
      </header>
      <main className="flex-1 p-4 sm:p-8 md:p-12">
        <div className="max-w-6xl mx-auto">
            <div className="mb-8 text-center sm:text-left">
                <h2 className="font-headline text-4xl font-bold tracking-tight">My Garden</h2>
                <p className="mt-2 text-lg text-muted-foreground">
                    A collection of your diagnosed plants.
                </p>
            </div>

            {plants.length === 0 ? (
                 <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <Leaf className="mx-auto h-16 w-16 text-muted-foreground" />
                    <h3 className="mt-4 text-2xl font-headline font-semibold">Your garden is empty</h3>
                    <p className="mt-2 text-muted-foreground">Start by diagnosing a plant to add it to your garden.</p>
                    <Button asChild className="mt-6">
                        <Link href="/">Diagnose a New Plant</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {plants.map((plant) => (
                    <Card key={plant.id} className="overflow-hidden">
                        <CardHeader className="p-0">
                            <div className="relative aspect-square w-full">
                                <Image 
                                    src={plant.imageDataUri} 
                                    alt={plant.plantName || 'Plant'}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                             <CardTitle className="font-headline text-xl mb-1 truncate">{plant.plantName}</CardTitle>
                             <p className="text-sm text-muted-foreground">
                                Saved {formatDistanceToNow(plant.savedAt.toDate(), { addSuffix: true })}
                             </p>
                        </CardContent>
                        <CardFooter className="p-4 pt-0">
                            {/* In the future, this could link to a detailed view */}
                            {/* <Button className="w-full">View Details</Button> */}
                        </CardFooter>
                    </Card>
                    ))}
                </div>
            )}
        </div>
      </main>
    </div>
  );
}
