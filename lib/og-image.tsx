import React from 'react'

export interface OGImageProps {
  title: string
  description?: string
  image?: string
  background?: string
}

export function OGImageTemplate({
  title,
  description,
  image,
  background = '#ffffff',
}: OGImageProps) {
  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '60px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background gradient overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Content container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          zIndex: 1,
          gap: '24px',
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: '#000',
            margin: 0,
            lineHeight: 1.2,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p
            style={{
              fontSize: '32px',
              color: '#666',
              margin: 0,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: '100%',
            }}
          >
            {description}
          </p>
        )}

        {/* Image if provided */}
        {image && (
          <img
            src={image}
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '12px',
              objectFit: 'cover',
              marginTop: '20px',
            }}
          />
        )}
      </div>
    </div>
  )
}
