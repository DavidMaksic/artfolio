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
   Row,
   Column,
} from '@vue-email/components';

defineProps<{ otp: string; magicLinkUrl: string; logoUrl: string }>();
</script>

<template>
   <Html lang="en">
      <Head>
         <component :is="'style'">
            @media only screen and (max-width: 480px) { .email-body {
            background-color: transparent !important; padding: 6px 0px
            !important; } .email-heading { font-size: 20px !important; }
            .email-text { font-size: 14px !important; line-height: 20px
            !important; } .email-otp { font-size: 26px !important;
            letter-spacing: 8px !important; } .email-footer { line-height: 20px
            !important; } .email-container { padding: 40px 30px !important; } }
         </component>
      </Head>
      <Preview>Your Artfolio sign-in code: {{ otp }}</Preview>
      <Body
         class="email-body"
         :style="{
            backgroundColor: '#f4f4f5',
            fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
            margin: 0,
            padding: '60px 0',
         }"
      >
         <Section :style="{ maxWidth: '480px', margin: '0 auto 24px' }">
            <Row>
               <Column align="center" :style="{ textAlign: 'center' }">
                  <Img
                     :src="logoUrl"
                     alt="Artfolio"
                     :width="95"
                     :height="26"
                     :style="{
                        display: 'block',
                        width: 'fit-content',
                        margin: '0 auto',
                     }"
                  />
               </Column>
            </Row>
         </Section>

         <Container
            class="email-container"
            :style="{
               maxWidth: '480px',
               backgroundColor: '#fff',
               borderRadius: '16px',
               padding: '40px',
            }"
         >
            <Heading
               as="h1"
               class="email-heading"
               :style="{
                  fontSize: '24px',
                  color: '#404040',
                  margin: '0 0 12px',
                  textAlign: 'center',
               }"
               >Sign in to your account</Heading
            >
            <Text
               class="email-text"
               :style="{
                  fontSize: '15px',
                  color: '#52525b',
                  lineHeight: '24px',
                  margin: '0 0 28px',
                  textAlign: 'center',
               }"
            >
               Click the button to sign in instantly, or enter the code below.
            </Text>
            <Button
               :href="magicLinkUrl"
               :style="{
                  backgroundColor: '#6f6277',
                  backgroundImage:
                     'linear-gradient(to right, #3e5a7a, #a06a74)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '17px',
                  padding: '12px 15px 15px',
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
                  padding: '16px',
                  backgroundColor: '#f4f4f5',
                  borderRadius: '12px',
                  textAlign: 'center',
               }"
            >
               <Text
                  class="email-otp"
                  :style="{
                     margin: 0,
                     fontSize: '28px',
                     fontWeight: 700,
                     letterSpacing: '10px',
                     color: '#404040',
                     fontFamily: 'ui-monospace,Menlo,monospace',
                  }"
                  >{{ otp }}</Text
               >
            </Section>
            <Text
               class="email-footer"
               :style="{
                  fontSize: '13px',
                  color: '#a1a1aa',
                  margin: 0,
                  textAlign: 'center',
               }"
            >
               This code expires in 10 minutes. If you didn't request it, you
               can safely ignore this email.
            </Text>
         </Container>
      </Body>
   </Html>
</template>
