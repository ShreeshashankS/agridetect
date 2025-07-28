"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import Image from "next/image";
import { Leaf, Upload, ArrowRight, LoaderCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { diagnoseDisease, type DiagnoseDiseaseOutput } from "@/ai/flows/diagnose-disease";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [diagnoses, setDiagnoses] = useState<DiagnoseDiseaseOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
          variant: "destructive",
          title: "Image too large",
          description: "Please upload an image smaller than 4MB.",
        })
        return;
      }

      handleReset();

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setImagePreview(URL.createObjectURL(file));
        setImageDataUri(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDiagnose = async () => {
    if (!imageDataUri) {
      setError("Please select an image first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDiagnoses(null);

    try {
      const result = await diagnoseDisease({ photoDataUri: imageDataUri });
      if (result.diseaseDiagnoses && result.diseaseDiagnoses.length > 0) {
        setDiagnoses(result);
      } else {
        setError("Could not identify any disease. The plant appears to be healthy or the image is unclear.");
      }
    } catch (e) {
      console.error(e);
      setError("An error occurred during diagnosis. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setImageDataUri(null);
    setDiagnoses(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-center border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Leaf className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-3xl font-bold text-primary">
            Agridetect
          </h1>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center p-4 sm:p-8 md:p-12">
        <div className="w-full max-w-4xl animate-in fade-in-50">
          {!diagnoses && !isLoading && (
            <div className="flex flex-col items-center gap-8">
              <div className="text-center">
                <h2 className="font-headline text-4xl font-bold tracking-tight text-foreground">
                  Plant Disease Diagnosis
                </h2>
                <p className="mt-2 text-lg text-muted-foreground">
                  Upload a photo of your plant to get an AI-powered diagnosis.
                </p>
              </div>

              {imagePreview ? (
                <div className="flex w-full flex-col items-center gap-4">
                  <div className="relative w-full max-w-md overflow-hidden rounded-lg shadow-lg aspect-[3/2]">
                    <Image
                      src={imagePreview}
                      alt="Plant preview"
                      fill
                      className="object-cover"
                      data-ai-hint="plant agriculture"
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button onClick={handleReset} variant="outline">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Choose another image
                    </Button>
                    <Button onClick={handleDiagnose} size="lg" className="bg-accent hover:bg-accent/90">
                      Diagnose Plant <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="plant-image-upload"
                  className="flex w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/50 bg-card p-12 text-center transition-colors hover:border-primary hover:bg-accent/10"
                >
                  <Upload className="h-12 w-12 text-primary" />
                  <span className="mt-4 font-semibold text-primary">
                    Click to upload or drag and drop
                  </span>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG, or WEBP (Max 4MB)
                  </p>
                  <input
                    id="plant-image-upload"
                    type="file"
                    className="sr-only"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-4">
              <LoaderCircle className="h-16 w-16 animate-spin text-primary" />
              <h3 className="font-headline text-2xl text-muted-foreground">
                Analyzing your plant...
              </h3>
              <p className="text-muted-foreground">This may take a moment.</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 text-center">
               <div className="rounded-full bg-destructive/10 p-3">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
              <h3 className="font-headline text-2xl text-destructive">
                Diagnosis Failed
              </h3>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={handleReset} variant="destructive">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}

          {diagnoses && (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                 <div className="text-center sm:text-left">
                    <h2 className="font-headline text-4xl font-bold tracking-tight">Diagnosis Complete</h2>
                    <p className="mt-2 text-lg text-muted-foreground">
                      We've identified the following potential issues.
                    </p>
                 </div>
                 <Button onClick={handleReset} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Diagnose Another
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-2">
                    {imagePreview && 
                    <div className="relative w-full overflow-hidden rounded-lg shadow-lg aspect-square">
                      <Image
                        src={imagePreview}
                        alt="Analyzed plant"
                        fill
                        className="object-cover"
                        data-ai-hint="plant agriculture"
                      />
                    </div>
                    }
                </div>
                <div className="md:col-span-3">
                  {diagnoses.diseaseDiagnoses.map((diagnosis, index) => (
                    <Card key={index} className="w-full shadow-md">
                      <CardHeader>
                        <CardTitle className="font-headline text-2xl text-accent">
                          {diagnosis.diseaseName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 pt-2">
                          <span className="font-medium">Confidence:</span>
                          <Progress value={diagnosis.confidenceScore * 100} className="w-48 bg-primary/20" />
                          <span className="font-semibold text-foreground">{Math.round(diagnosis.confidenceScore * 100)}%</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible defaultValue="reason" className="w-full">
                          <AccordionItem value="reason">
                            <AccordionTrigger className="font-headline text-lg">Reasoning</AccordionTrigger>
                            <AccordionContent>
                              <p className="text-base text-muted-foreground">{diagnosis.reason}</p>
                            </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="precautions">
                            <AccordionTrigger className="font-headline text-lg">Precautions</AccordionTrigger>
                            <AccordionContent>
                               <p className="text-base text-muted-foreground">{diagnosis.precaution}</p>
                            </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="remedies">
                            <AccordionTrigger className="font-headline text-lg">Remedies</AccordionTrigger>
                            <AccordionContent>
                              <p className="text-base text-muted-foreground">{diagnosis.remedy}</p>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        Powered by AI. For informational purposes only.
      </footer>
    </div>
  );
}
