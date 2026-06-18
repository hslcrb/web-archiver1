#!/usr/bin/env python3
from PIL import Image, ImageDraw

def create_icon(size):
    # 배경 생성 (파란색 그라데이션)
    img = Image.new('RGB', (size, size), color='#2196F3')
    draw = ImageDraw.Draw(img)
    
    # 보관함 박스 그리기
    padding = int(size * 0.2)
    box_width = int(size * 0.6)
    box_height = int(size * 0.5)
    box_x = padding
    box_y = padding + int(size * 0.15)
    
    # 박스 테두리 (흰색)
    line_width = max(1, size // 16)
    draw.rectangle(
        [box_x, box_y, box_x + box_width, box_y + box_height],
        outline='white',
        width=line_width
    )
    
    # 박스 상단 뚜껑
    lid_height = int(size * 0.1)
    draw.rectangle(
        [box_x - int(size * 0.05), box_y - lid_height, 
         box_x + box_width + int(size * 0.05), box_y],
        fill='white'
    )
    
    # 화살표 (아래 방향)
    arrow_x = size // 2
    arrow_y = box_y + int(box_height * 0.3)
    arrow_size = int(size * 0.15)
    
    # 화살표 삼각형
    arrow_points = [
        (arrow_x, arrow_y + arrow_size),
        (arrow_x - int(arrow_size * 0.6), arrow_y),
        (arrow_x + int(arrow_size * 0.6), arrow_y)
    ]
    draw.polygon(arrow_points, fill='white')
    
    # 화살표 줄기
    stem_width = int(size * 0.08)
    draw.rectangle(
        [arrow_x - stem_width//2, box_y - int(size * 0.05),
         arrow_x + stem_width//2, arrow_y + arrow_size],
        fill='white'
    )
    
    return img

# 아이콘 생성
icon16 = create_icon(16)
icon48 = create_icon(48)
icon128 = create_icon(128)

# 저장
icon16.save('icons/icon16.png')
icon48.save('icons/icon48.png')
icon128.save('icons/icon128.png')

print('✓ 아이콘 생성 완료!')
print('  - icons/icon16.png')
print('  - icons/icon48.png')
print('  - icons/icon128.png')
