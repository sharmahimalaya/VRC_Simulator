export default function imageLoader({ src }) {
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? '' 
    : 'https://sharmahimalaya.github.io/VRC_Simulator';
  return `${baseUrl}${src}`;
}