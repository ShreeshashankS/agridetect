
"use client";

import { useState, useEffect, type ChangeEvent, useRef } from "react";
import Image from "next/image";
import Link from 'next/link';
import { Leaf, Upload, ArrowRight, LoaderCircle, AlertTriangle, RefreshCw, Bot, ShieldCheck, Sprout, CheckCircle, User, LogIn, LogOut, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { diagnoseDisease, type DiagnoseDiseaseOutput } from "@/ai/flows/diagnose-disease";
import { identifyPlant, type IdentifyPlantOutput } from "@/ai/flows/identify-plant";
import { remedyAssistant, type RemedyAssistantInput, type RemedyAssistantOutput } from "@/ai/flows/remedy-assistant";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePlant } from "@/lib/firestore";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";


type ProcessStep = "idle" | "identifying" | "identified" | "diagnosing" | "diagnosed" | "error";
type ChatMessage = {
  role: 'user' | 'model';
  content: string;
}

export default function Home() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [diagnoses, setDiagnoses] = useState<DiagnoseDiseaseOutput | null>(null);
  const [plantId, setPlantId] = useState<IdentifyPlantOutput | null>(null);
  const [step, setStep] = useState<ProcessStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Chatbot state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollAreaRef = useRef<HTMLDivElement>(null);


  const { toast } = useToast();
  const { user, signUp, signIn, signOut: firebaseSignOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);
  
  useEffect(() => {
    // Scroll to the bottom of the chat history when it updates
    if (chatScrollAreaRef.current) {
        chatScrollAreaRef.current.scrollTo({
        top: chatScrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chatHistory]);

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

  const handleStart = async () => {
    if (!imageDataUri) {
      setError("Please select an image first.");
      setStep("error");
      return;
    }

    setStep("identifying");
    setError(null);
    setPlantId(null);
    setDiagnoses(null);

    try {
      const result = await identifyPlant({ photoDataUri: imageDataUri });
      if (result.isPlant) {
        setPlantId(result);
        setStep("identified");
      } else {
        setError("We couldn't detect a plant in the image. Please try a different photo.");
        setStep("error");
      }
    } catch (e) {
      console.error(e);
      setError("An error occurred during plant identification. Please try again.");
      setStep("error");
    }
  };
  
  const handleDiagnose = async () => {
    if (!imageDataUri || !plantId) {
      setError("An error occurred. Please start over.");
      setStep("error");
      return;
    }

    setStep("diagnosing");
    setError(null);
    
    try {
      const result = await diagnoseDisease({ photoDataUri: imageDataUri, plantName: plantId.commonName! });
      if (result.isHealthy || (result.diseaseDiagnoses && result.diseaseDiagnoses.length > 0)) {
        setDiagnoses(result);
        setStep("diagnosed");
      } else {
        setError("Could not complete the diagnosis. The image may be unclear.");
        setStep("error");
      }
    } catch (e) {
      console.error(e);
      setError("An error occurred during diagnosis. Please try again.");
      setStep("error");
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setImageDataUri(null);
    setDiagnoses(null);
    setPlantId(null);
    setError(null);
    setStep("idle");
    setIsSaving(false);
    setChatHistory([]);
    setChatInput("");
  };
  
  const scrollToUpload = () => {
    const uploadSection = document.getElementById('upload-section');
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSavePlant = async () => {
    if (!user || !plantId || !imageDataUri) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to save a plant.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await savePlant(user.uid, {
        plantName: plantId.commonName,
        latinName: plantId.latinName,
        imageDataUri: imageDataUri,
        diagnosis: diagnoses,
      });
      toast({
        title: 'Plant Saved!',
        description: `${plantId.commonName} has been added to your garden.`,
      });
    } catch(err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'There was a problem saving your plant. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !diagnoses || !plantId) return;

    const newQuestion: ChatMessage = { role: 'user', content: chatInput };
    setChatHistory(prev => [...prev, newQuestion]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      // For simplicity, we use the first diagnosis's remedy as context.
      const firstDiagnosis = diagnoses.diseaseDiagnoses[0];

      const input: RemedyAssistantInput = {
        disease: firstDiagnosis.diseaseName,
        plantType: plantId.commonName || 'the plant',
        initialRemedy: firstDiagnosis.remedy,
        question: chatInput,
        conversationHistory: chatHistory
      };
      
      const result = await remedyAssistant(input);
      const newAnswer: ChatMessage = { role: 'model', content: result.answer };
      setChatHistory(prev => [...prev, newAnswer]);

    } catch(err) {
      console.error(err);
      const errorAnswer: ChatMessage = { role: 'model', content: "Sorry, I'm having trouble thinking right now. Please try again in a moment." };
      setChatHistory(prev => [...prev, errorAnswer]);
    } finally {
      setIsChatLoading(false);
    }
  }
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await signUp(email, password);
      setAuthOpen(false);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await signIn(email, password);
      setAuthOpen(false);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };
  
  const handleSignOut = async () => {
    await firebaseSignOut();
  }

  const isLoading = step === 'identifying' || step === 'diagnosing';

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-8">
        <div className="flex items-center gap-2">
          <Leaf className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-3xl font-bold text-primary">
            Agridetect
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/garden">My Garden</Link>
              </Button>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut />
                Sign Out
              </Button>
            </>
          ) : (
            <Button onClick={() => setAuthOpen(true)}>
              <User className="mr-2"/>
              Login / Sign Up
            </Button>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center">
        {step !== 'diagnosed' && !isLoading && step !== 'error' && (
          <div className="w-full">
            <section className="w-full py-20 md:py-32 lg:py-40 bg-card">
              <div className="container mx-auto px-4 md:px-6">
                <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:gap-24">
                  <div className="flex flex-col justify-center space-y-4">
                    <div className="space-y-2">
                      <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-primary">
                        Your AI-Powered Plant Doctor
                      </h1>
                      <p className="max-w-[600px] text-muted-foreground md:text-xl">
                        Snap a photo, and Agridetect's advanced AI will identify your plant, diagnose diseases, and offer you instant insights to keep your garden healthy.
                      </p>
                    </div>
                    <Button size="lg" className="self-start" onClick={scrollToUpload}>
                      Analyze My Plant
                      <ArrowRight className="ml-2"/>
                    </Button>
                  </div>
                  <Image
                    src="https://placehold.co/600x400.png"
                    width="600"
                    height="400"
                    alt="Hero"
                    className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
                    data-ai-hint="plant agriculture"
                  />
                </div>
              </div>
            </section>
            
            <section className="w-full py-12 md:py-24 lg:py-32">
                <div className="container mx-auto space-y-12 px-4 md:px-6">
                    <div className="flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="space-y-2">
                            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">How It Works</h2>
                            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                                Agridetect makes plant care simple. In a few easy steps, you can go from worried plant parent to informed gardener.
                            </p>
                        </div>
                    </div>
                    <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-3 md:gap-12 lg:max-w-5xl lg:grid-cols-4">
                        <div className="grid gap-1 text-center">
                           <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                             <Upload className="h-8 w-8 text-primary" />
                           </div>
                            <h3 className="text-lg font-bold font-headline">1. Upload Photo</h3>
                            <p className="text-sm text-muted-foreground">Take a clear picture of your plant. For best results, make sure the plant is well-lit.</p>
                        </div>
                        <div className="grid gap-1 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                             <Sprout className="h-8 w-8 text-primary" />
                           </div>
                            <h3 className="text-lg font-bold font-headline">2. Identify Plant</h3>
                            <p className="text-sm text-muted-foreground">Our AI analyzes the image to first identify the type of plant.</p>
                        </div>
                        <div className="grid gap-1 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                             <Bot className="h-8 w-8 text-primary" />
                           </div>
                            <h3 className="text-lg font-bold font-headline">3. AI Diagnosis</h3>
                            <p className="text-sm text-muted-foreground">The AI then checks for signs of disease, using the plant identification to improve accuracy.</p>
                        </div>
                        <div className="grid gap-1 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                             <ShieldCheck className="h-8 w-8 text-primary" />
                           </div>
                            <h3 className="text-lg font-bold font-headline">4. Get a Plan</h3>
                            <p className="text-sm text-muted-foreground">Receive a detailed diagnosis and actionable advice on how to treat your plant.</p>
                        </div>
                    </div>
                </div>
            </section>


            <section id="upload-section" className="w-full py-12 md:py-24 lg:py-32 bg-card">
              <div className="container mx-auto px-4 md:px-6">
                <div className="flex flex-col items-center gap-8">
                  <div className="text-center">
                    <h2 className="font-headline text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                      Ready to Analyze?
                    </h2>
                    <p className="mt-2 text-lg text-muted-foreground">
                      Upload a photo of your plant to get started.
                    </p>
                  </div>

                  {!imagePreview && (
                     <label
                      htmlFor="plant-image-upload"
                      className="flex w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/50 bg-background p-12 text-center transition-colors hover:border-primary hover:bg-accent/10"
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

                  {imagePreview && step === "idle" && (
                    <div className="flex w-full flex-col items-center gap-4">
                      <div className="relative w-full max-w-md overflow-hidden rounded-lg shadow-lg aspect-[3/2]">
                        <Image src={imagePreview} alt="Plant preview" fill className="object-cover" />
                      </div>
                      <div className="flex gap-4">
                        <Button onClick={handleReset} variant="outline">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Choose another image
                        </Button>
                        <Button onClick={handleStart} size="lg" className="bg-accent hover:bg-accent/90">
                          Identify Plant <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {imagePreview && step === "identified" && plantId && (
                     <div className="flex w-full flex-col items-center gap-6 text-center">
                        <div className="relative w-full max-w-md overflow-hidden rounded-lg shadow-lg aspect-[3/2]">
                          <Image src={imagePreview} alt="Plant preview" fill className="object-cover" />
                        </div>
                        <div className="space-y-2">
                           <h3 className="font-headline text-2xl font-bold">Plant Identified!</h3>
                           <p className="text-lg text-muted-foreground">
                              We've identified your plant as a <strong className="text-accent">{plantId.commonName}</strong> <em className="text-sm">({plantId.latinName})</em>.
                           </p>
                           <p>Ready to check its health?</p>
                        </div>
                        <div className="flex gap-4">
                          <Button onClick={handleReset} variant="outline">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Start Over
                          </Button>
                          <Button onClick={handleDiagnose} size="lg">
                            Diagnose Health <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                    </div>
                  )}

                </div>
              </div>
            </section>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 sm:p-8 md:p-12">
            <LoaderCircle className="h-16 w-16 animate-spin text-primary" />
            <h3 className="font-headline text-2xl text-muted-foreground">
              {step === 'identifying' ? "Identifying your plant..." : "Analyzing its health..."}
            </h3>
            <p className="text-muted-foreground">This may take a moment.</p>
          </div>
        )}

        {step === 'error' && !isLoading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-4 sm:p-8 md:p-12">
             <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <h3 className="font-headline text-2xl text-destructive">
              Analysis Failed
            </h3>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={handleReset} variant="destructive">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}

        {step === 'diagnosed' && diagnoses && (
          <div className="w-full max-w-6xl mx-auto p-4 sm:p-8 md:p-12 flex flex-col gap-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
               <div className="text-center sm:text-left">
                  <h2 className="font-headline text-4xl font-bold tracking-tight">Diagnosis Complete</h2>
                  <p className="mt-2 text-lg text-muted-foreground">
                    {diagnoses.isHealthy ? `Your ${plantId?.commonName || 'plant'} appears to be healthy!` : "We've identified the following potential issues."}
                  </p>
               </div>
               <div className="flex gap-2">
                {user && (
                    <Button onClick={handleSavePlant} disabled={isSaving}>
                      {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
                      Save to Garden
                    </Button>
                  )}
                <Button onClick={handleReset} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Diagnose Another
                </Button>
              </div>
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
                    />
                  </div>
                  }
              </div>
              <div className="md:col-span-3">
                {diagnoses.isHealthy && diagnoses.diseaseDiagnoses.length > 0 ? (
                  <Card className="w-full shadow-md bg-green-950/20 border-green-500/30">
                     <CardHeader className="flex-row items-center gap-4">
                        <CheckCircle className="h-10 w-10 text-green-400" />
                        <div>
                          <CardTitle className="font-headline text-2xl text-green-300">
                           {diagnoses.diseaseDiagnoses[0].diseaseName}
                          </CardTitle>
                          <CardDescription>
                            No signs of disease detected.
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent>
                          <h4 className="font-headline text-lg mb-2">General Care Tips</h4>
                          <p className="text-base text-muted-foreground">{diagnoses.diseaseDiagnoses[0].reason}</p>
                      </CardContent>
                  </Card>
                ) : (
                  <Card className="w-full shadow-md">
                    <CardHeader>
                      <CardTitle className="font-headline text-2xl text-accent">
                        {diagnoses.diseaseDiagnoses[0].diseaseName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 pt-2">
                        <span className="font-medium">Confidence:</span>
                        <Progress value={diagnoses.diseaseDiagnoses[0].confidenceScore * 100} className="w-48 bg-primary/20" />
                        <span className="font-semibold text-foreground">{Math.round(diagnoses.diseaseDiagnoses[0].confidenceScore * 100)}%</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible defaultValue="reason" className="w-full">
                        <AccordionItem value="reason">
                          <AccordionTrigger className="font-headline text-lg">Reasoning</AccordionTrigger>
                          <AccordionContent>
                            <p className="text-base text-muted-foreground">{diagnoses.diseaseDiagnoses[0].reason}</p>
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="precautions">
                          <AccordionTrigger className="font-headline text-lg">Precautions</AccordionTrigger>
                          <AccordionContent>
                             <p className="text-base text-muted-foreground">{diagnoses.diseaseDiagnoses[0].precaution}</p>
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="remedies">
                          <AccordionTrigger className="font-headline text-lg">Remedies</AccordionTrigger>
                          <AccordionContent>
                            <p className="text-base text-muted-foreground">{diagnoses.diseaseDiagnoses[0].remedy}</p>
                          </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="assistant">
                            <AccordionTrigger className="font-headline text-lg">Ask a Follow-up Question</AccordionTrigger>
                            <AccordionContent>
                              <div className="flex flex-col gap-4">
                                <ScrollArea className="h-48 w-full rounded-md border p-4" ref={chatScrollAreaRef}>
                                    <div className="flex flex-col gap-4">
                                        {chatHistory.map((message, index) => (
                                            <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                                                {message.role === 'model' && <Avatar className="h-8 w-8 border"><Bot className="h-5 w-5"/></Avatar>}
                                                <div className={cn("max-w-[80%] rounded-lg p-3 text-sm", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                                    <p>{message.content}</p>
                                                </div>
                                                 {message.role === 'user' && <Avatar className="h-8 w-8 border"><User className="h-5 w-5"/></Avatar>}
                                            </div>
                                        ))}
                                        {isChatLoading && (
                                            <div className="flex items-center gap-3 justify-start">
                                                <Avatar className="h-8 w-8 border"><Bot className="h-5 w-5"/></Avatar>
                                                <div className="bg-muted p-3 rounded-lg">
                                                    <LoaderCircle className="h-5 w-5 animate-spin" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                                <form onSubmit={handleAskAssistant} className="flex gap-2">
                                    <Textarea 
                                        placeholder="e.g., Is there an organic alternative?"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAskAssistant(e as any);
                                          }
                                        }}
                                        disabled={isChatLoading}
                                        className="min-h-0"
                                    />
                                    <Button type="submit" disabled={isChatLoading || !chatInput.trim()} size="icon">
                                        <Send />
                                    </Button>
                                </form>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome to Agridetect</DialogTitle>
            <DialogDescription>
              Sign in or create an account to save your plants and track their health over time.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <Card>
                  <CardHeader>
                    <CardTitle>Sign In</CardTitle>
                    <CardDescription>Access your account</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input id="signin-email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input id="signin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    {authError && <p className="text-destructive text-sm">{authError}</p>}
                    <Button type="submit" className="w-full">Sign In</Button>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <Card>
                  <CardHeader>
                    <CardTitle>Sign Up</CardTitle>
                    <CardDescription>Create a new account</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}/>
                    </div>
                    {authError && <p className="text-destructive text-sm">{authError}</p>}
                    <Button type="submit" className="w-full">Create Account</Button>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        Powered by AI. For informational purposes only.
      </footer>
    </div>
  );
}

    