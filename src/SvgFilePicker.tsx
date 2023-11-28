import React from 'react';
import { FileUpload } from '@grafana/ui';

export const UploadSVG = ( { onChange }: { onChange: (value: string) => any } ) => {
  return (
    <FileUpload
      accept=".svg"
      onFileUpload={(event) => {
        const tgt: any = event.target;
        if (tgt?.files && tgt?.files.length>0){
          const file = tgt?.files[0];
          if (file.type === "image/svg+xml") {
            const reader = new FileReader();
            reader.onload = function () {
             onChange(reader.result as string); 
            }
            reader.readAsDataURL(file);
           } 
        }
      }}
    >
      Upload SVG file
    </FileUpload>
  );
};
