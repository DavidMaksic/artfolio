<script setup lang="ts">
import { computed } from 'vue';
import {
   Html,
   Head,
   Preview,
   Body,
   Container,
   Heading,
   Text,
   Button,
} from '@vue-email/components';

const props = defineProps<{ name?: string; url: string }>();
const firstName = computed(() => props.name?.split(' ')[0]);
</script>

<template>
   <Html lang="en">
      <Head />
      <Preview>Your portfolio is ready. Start sharing your work.</Preview>
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
            <Text
               :style="{
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#111',
                  margin: '0 0 24px',
               }"
               >ARTFOLIO</Text
            >
            <Heading
               as="h1"
               :style="{ fontSize: '24px', color: '#111', margin: '0 0 8px' }"
            >
               Welcome{{ firstName ? `, ${firstName}` : '' }} 🎨
            </Heading>
            <Text
               :style="{
                  fontSize: '15px',
                  color: '#52525b',
                  lineHeight: '24px',
                  margin: '0 0 28px',
               }"
            >
               Your portfolio is ready. Upload your first piece and start
               sharing your work with the world.
            </Text>
            <Button
               :href="url"
               :style="{
                  backgroundColor: '#111',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '15px',
                  padding: '14px 28px',
                  borderRadius: '10px',
               }"
            >
               Open your portfolio
            </Button>
            <Text
               :style="{
                  fontSize: '13px',
                  color: '#a1a1aa',
                  margin: '32px 0 0',
               }"
            >
               Questions? Just reply to this email and we'll help out.
            </Text>
         </Container>
      </Body>
   </Html>
</template>
