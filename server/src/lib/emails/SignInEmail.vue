<script setup lang="ts">
import {
   Html,
   Head,
   Preview,
   Body,
   Container,
   Section,
   Heading,
   Text,
   Button,
   Img,
} from '@vue-email/components';

defineProps<{ otp: string; magicLinkUrl: string; logoUrl: string }>();
</script>

<template>
   <Html lang="en">
      <Head />
      <Preview>Your Artfolio sign-in code: {{ otp }}</Preview>
      <Body
         :style="{
            backgroundColor: '#f4f4f5',
            fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
            margin: 0,
            padding: '40px 0',
         }"
      >
         <Container
            :style="{
               maxWidth: '480px',
               backgroundColor: '#fff',
               borderRadius: '16px',
               padding: '40px',
            }"
         >
            <Img
               :src="logoUrl"
               alt="Artfolio"
               :width="120"
               :height="32"
               :style="{
                  display: 'block',
                  margin: '0 0 24px',
                  textAlign: 'center',
               }"
            />
            <Heading
               as="h1"
               :style="{ fontSize: '24px', color: '#111', margin: '0 0 8px' }"
               >Sign in to your account</Heading
            >
            <Text
               :style="{
                  fontSize: '15px',
                  color: '#52525b',
                  lineHeight: '24px',
                  margin: '0 0 28px',
               }"
            >
               Click the button to sign in instantly, or enter the code below.
            </Text>
            <Button
               :href="magicLinkUrl"
               :style="{
                  backgroundColor: '#3e5a7a',
                  backgroundImage:
                     'linear-gradient(to right, #3e5a7a, #a06a74)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '20px',
                  padding: '14px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'block',
               }"
            >
               Sign in
            </Button>
            <Section
               :style="{
                  margin: '20px 0',
                  padding: '20px',
                  backgroundColor: '#f4f4f5',
                  borderRadius: '12px',
                  textAlign: 'center',
               }"
            >
               <Text
                  :style="{
                     margin: 0,
                     fontSize: '32px',
                     fontWeight: 700,
                     letterSpacing: '10px',
                     color: '#111',
                     fontFamily: 'ui-monospace,Menlo,monospace',
                  }"
                  >{{ otp }}</Text
               >
            </Section>
            <Text :style="{ fontSize: '13px', color: '#a1a1aa', margin: 0 }">
               This code expires in 10 minutes. If you didn't request it, you
               can safely ignore this email.
            </Text>
         </Container>
      </Body>
   </Html>
</template>
