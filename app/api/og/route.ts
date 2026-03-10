import { ImageResponse } from 'next/og'
import { OGImageTemplate } from '@/lib/og-image'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // Get query parameters
  const title = searchParams.get('title') || 'Default Title'
  const description = searchParams.get('description')
  const image = searchParams.get('image')
  const background = searchParams.get('bg') || '#ffffff'

  try {
    return new ImageResponse(
      (
        <OGImageTemplate
          title={title}
          description={description || undefined}
          image={image || undefined}
          background={background}
        />
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)
    return new Response('Failed to generate image', { status: 500 })
  }
}
