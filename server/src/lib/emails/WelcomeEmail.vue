<script setup lang="ts">
import {
   Html,
   Head,
   Preview,
   Body,
   Container,
   Heading,
   Text,
   Button,
   Img,
   Row,
   Column,
} from '@vue-email/components';

defineProps<{ url: string; logoUrl: string }>();
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
            letter-spacing: 8px !important; } .email-footer { font-size: 8px;
            line-height: 16px !important; } .email-container { padding: 40px
            30px !important; } }
         </component>
      </Head>
      <Preview>Your portfolio is ready. Start sharing your work.</Preview>
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
            >
               Welcome 🎨
            </Heading>
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
               Your account is verified. Upload your first piece and start
               sharing your work with the world.
            </Text>
            <Button
               :href="url"
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
               Open your portfolio
            </Button>
            <Text
               class="email-footer"
               :style="{
                  fontSize: '13px',
                  color: '#a1a1aa',
                  margin: '20px 0 0',
                  textAlign: 'center',
               }"
            >
               Questions? Just reply to this email and we'll help out.
            </Text>
         </Container>
      </Body>
   </Html>
</template>
