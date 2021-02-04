// Copyright 1996-2021 Cyberbotics Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {arrayXPointer} from "./WbUtils.js";
import {WbWrenShaders} from "./WbWrenShaders.js";

class WbWrenPostProcessingEffects {
  static loadResources(lensFlareLenTexture, smaaAreaTexture, smaaSearchTexture, gtaoNoiseTexture){
    WbWrenPostProcessingEffects.lensFlareLenTexture = WbWrenPostProcessingEffects.loadImage(lensFlareLenTexture);
    WbWrenPostProcessingEffects.smaaAreaTexture = WbWrenPostProcessingEffects.loadImage(smaaAreaTexture);
    WbWrenPostProcessingEffects.smaaSearchTexture = WbWrenPostProcessingEffects.loadImage(smaaSearchTexture);
    WbWrenPostProcessingEffects.gtaoNoiseTexture = WbWrenPostProcessingEffects.loadImage(gtaoNoiseTexture);
  }

  static clearResources() {
    if(WbWrenPostProcessingEffects.lensFlareLenTexture !== null)
      _wr_texture_delete(WbWrenPostProcessingEffects.lensFlareLenTexture);

    if(WbWrenPostProcessingEffects.smaaAreaTexture !== null)
      _wr_texture_delete(WbWrenPostProcessingEffects.smaaAreaTexture);

    if(WbWrenPostProcessingEffects.smaaSearchTexture !== null)
      _wr_texture_delete(WbWrenPostProcessingEffects.smaaSearchTexture);

    if(WbWrenPostProcessingEffects.gtaoNoiseTexture !== null)
      _wr_texture_delete(WbWrenPostProcessingEffects.gtaoNoiseTexture);

    WbWrenPostProcessingEffects.lensFlareLenTexture = null;
    WbWrenPostProcessingEffects.smaaAreaTexture = null;
    WbWrenPostProcessingEffects.smaaSearchTexture = null;
    WbWrenPostProcessingEffects.gtaoNoiseTexture = null;
  }
  static loadImage(image){
    let targetTexture = _wr_texture_2d_new();
    _wr_texture_set_translucent(targetTexture, true);
    _wr_texture_set_size(targetTexture, image.width, image.height);

    let bitsPointer = arrayXPointer(image.bits);
    _wr_texture_2d_set_data(targetTexture, bitsPointer);
    Module.ccall('wr_texture_2d_set_file_path', null, ['number', 'string'], [targetTexture, image.url]);
    _wr_texture_2d_set_cache_persistency(targetTexture, true);
    _wr_texture_set_translucent(targetTexture, image.isTranslucent);
    _wr_texture_setup(targetTexture)
    _free(bitsPointer);
    return targetTexture
  }

  static gtao(width, height, textureFormat, depthTexture, normalTexture, halfRes) {

    let gtaoEffect = _wr_post_processing_effect_new();
    _wr_post_processing_effect_set_drawing_index(gtaoEffect, 1);//enum

    let colorPassThrough = _wr_post_processing_effect_pass_new();
    Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [colorPassThrough, "colorPassThrough"]);
    _wr_post_processing_effect_pass_set_program(colorPassThrough, WbWrenShaders.passThroughShader());
    _wr_post_processing_effect_pass_set_output_size(colorPassThrough, width, height);
    _wr_post_processing_effect_pass_set_alpha_blending(colorPassThrough, false);
    _wr_post_processing_effect_pass_set_input_texture_count(colorPassThrough, 1);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(colorPassThrough, 0, false);
    _wr_post_processing_effect_pass_set_output_texture_count(colorPassThrough, 1);
    _wr_post_processing_effect_pass_set_output_texture_format(colorPassThrough, 0, textureFormat);
    _wr_post_processing_effect_append_pass(gtaoEffect, colorPassThrough);

    let depthDownsamplePassThrough, normalDownsamplePassThrough = undefined;

    if (halfRes) {
      depthDownsamplePassThrough = _wr_post_processing_effect_pass_new();
      Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [depthDownsamplePassThrough, "depthDownsamplePassThrough"]);
      _wr_post_processing_effect_pass_set_program(depthDownsamplePassThrough, WbWrenShaders.passThroughShader());
      _wr_post_processing_effect_pass_set_output_size(depthDownsamplePassThrough, width / 2, height / 2);
      _wr_post_processing_effect_pass_set_input_texture_count(depthDownsamplePassThrough, 1);
      _wr_post_processing_effect_pass_set_alpha_blending(depthDownsamplePassThrough, false);
      _wr_post_processing_effect_pass_set_input_texture(depthDownsamplePassThrough, 0, depthTexture);
      _wr_post_processing_effect_pass_set_input_texture_interpolation(depthDownsamplePassThrough, 0, false);
      _wr_post_processing_effect_pass_set_output_texture_count(depthDownsamplePassThrough, 1);
      _wr_post_processing_effect_pass_set_output_texture_format(depthDownsamplePassThrough, 0, ENUM.WR_TEXTURE_INTERNAL_FORMAT_R32F);
      _wr_post_processing_effect_append_pass(gtaoEffect, depthDownsamplePassThrough);

      normalDownsamplePassThrough = _wr_post_processing_effect_pass_new();
      Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [normalDownsamplePassThrough, "normalDownsamplePassThrough"]);
      _wr_post_processing_effect_pass_set_program(normalDownsamplePassThrough, WbWrenShaders.passThroughShader());
      _wr_post_processing_effect_pass_set_alpha_blending(normalDownsamplePassThrough, false);
      _wr_post_processing_effect_pass_set_output_size(normalDownsamplePassThrough, width / 2, height / 2);
      _wr_post_processing_effect_pass_set_input_texture_count(normalDownsamplePassThrough, 1);
      _wr_post_processing_effect_pass_set_input_texture(normalDownsamplePassThrough, 0, normalTexture);
      _wr_post_processing_effect_pass_set_input_texture_interpolation(normalDownsamplePassThrough, 0, false);
      _wr_post_processing_effect_pass_set_output_texture_count(normalDownsamplePassThrough, 1);
      _wr_post_processing_effect_pass_set_output_texture_format(normalDownsamplePassThrough, 0, textureFormat);
      _wr_post_processing_effect_append_pass(gtaoEffect, normalDownsamplePassThrough);
    }

    let gtaoForwardPass = _wr_post_processing_effect_pass_new();
    Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [gtaoForwardPass, "gtaoForwardPass"]);
    _wr_post_processing_effect_pass_set_program(gtaoForwardPass, WbWrenShaders.gtaoShader());
    _wr_post_processing_effect_pass_set_input_texture_count(gtaoForwardPass, 3);

    if (halfRes)
      _wr_post_processing_effect_pass_set_output_size(gtaoForwardPass, width / 2, height / 2);
    else {
      _wr_post_processing_effect_pass_set_output_size(gtaoForwardPass, width, height);
      _wr_post_processing_effect_pass_set_input_texture(gtaoForwardPass, 0, depthTexture);
      _wr_post_processing_effect_pass_set_input_texture(gtaoForwardPass, 1, normalTexture);
    }

    _wr_post_processing_effect_pass_set_input_texture(gtaoForwardPass, 2, WbWrenPostProcessingEffects.gtaoNoiseTexture);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(gtaoForwardPass, 0, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(gtaoForwardPass, 1, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(gtaoForwardPass, 2, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(gtaoForwardPass, 0, false);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(gtaoForwardPass, 1, false);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(gtaoForwardPass, 2, false);
    _wr_post_processing_effect_pass_set_clear_before_draw(gtaoForwardPass, true);
    _wr_post_processing_effect_pass_set_alpha_blending(gtaoForwardPass, false);
    _wr_post_processing_effect_pass_set_output_texture_count(gtaoForwardPass, 1);
    _wr_post_processing_effect_pass_set_output_texture_format(gtaoForwardPass, 0, ENUM.WR_TEXTURE_INTERNAL_FORMAT_RED);
    _wr_post_processing_effect_append_pass(gtaoEffect, gtaoForwardPass);

    let spatialDenoise = _wr_post_processing_effect_pass_new();
    Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [spatialDenoise, "spatialDenoise"]);
    _wr_post_processing_effect_pass_set_program(spatialDenoise, WbWrenShaders.gtaoSpatialDenoiseShader());

    if (halfRes)
      _wr_post_processing_effect_pass_set_output_size(spatialDenoise, width / 2, height / 2);
    else
      _wr_post_processing_effect_pass_set_output_size(spatialDenoise, width, height);

    _wr_post_processing_effect_pass_set_input_texture_count(spatialDenoise, 2);
    _wr_post_processing_effect_pass_set_input_texture(spatialDenoise, 1, depthTexture);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(spatialDenoise, 0, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(spatialDenoise, 1, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(spatialDenoise, 0, true);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(spatialDenoise, 1, false);
    _wr_post_processing_effect_pass_set_alpha_blending(spatialDenoise, false);
    _wr_post_processing_effect_pass_set_clear_before_draw(spatialDenoise, true);
    _wr_post_processing_effect_pass_set_output_texture_count(spatialDenoise, 1);
    _wr_post_processing_effect_pass_set_output_texture_format(spatialDenoise, 0, ENUM.WR_TEXTURE_INTERNAL_FORMAT_RED);
    _wr_post_processing_effect_append_pass(gtaoEffect, spatialDenoise);

    let temporalDenoise = _wr_post_processing_effect_pass_new();
    Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [temporalDenoise, "temporalDenoise"]);
    _wr_post_processing_effect_pass_set_program(temporalDenoise, WbWrenShaders.gtaoTemporalDenoiseShader());
    _wr_post_processing_effect_pass_set_output_size(temporalDenoise, width, height);
    _wr_post_processing_effect_pass_set_input_texture_count(temporalDenoise, 4);
    _wr_post_processing_effect_pass_set_input_texture(temporalDenoise, 3, depthTexture);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(temporalDenoise, 0, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(temporalDenoise, 1, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(temporalDenoise, 2, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(temporalDenoise, 3, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(temporalDenoise, 0, true);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(temporalDenoise, 1, true);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(temporalDenoise, 2, false);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(temporalDenoise, 3, false);
    _wr_post_processing_effect_pass_set_alpha_blending(temporalDenoise, false);
    _wr_post_processing_effect_pass_set_clear_before_draw(temporalDenoise, true);
    _wr_post_processing_effect_pass_set_output_texture_count(temporalDenoise, 1);
    _wr_post_processing_effect_pass_set_output_texture_format(temporalDenoise, 0, ENUM.WR_TEXTURE_INTERNAL_FORMAT_RED);
    _wr_post_processing_effect_append_pass(gtaoEffect, temporalDenoise);

    let finalBlend = _wr_post_processing_effect_pass_new();
    Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [finalBlend, "FinalBlend"]);
    _wr_post_processing_effect_pass_set_program(finalBlend, WbWrenShaders.gtaoCombineShader());
    _wr_post_processing_effect_pass_set_output_size(finalBlend, width, height);
    _wr_post_processing_effect_pass_set_input_texture_count(finalBlend, 3);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(finalBlend, 0, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(finalBlend, 1, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(finalBlend, 2, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(finalBlend, 0, false);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(finalBlend, 1, false);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(finalBlend, 2, false);
    _wr_post_processing_effect_pass_set_clear_before_draw(finalBlend, true);
    _wr_post_processing_effect_pass_set_input_texture(finalBlend, 2, depthTexture);
    _wr_post_processing_effect_pass_set_output_texture_count(finalBlend, 3);
    _wr_post_processing_effect_pass_set_output_texture_format(finalBlend, 0, textureFormat);
    _wr_post_processing_effect_pass_set_output_texture_format(finalBlend, 1, ENUM.WR_TEXTURE_INTERNAL_FORMAT_RED);
    _wr_post_processing_effect_pass_set_output_texture_format(finalBlend, 2, ENUM.WR_TEXTURE_INTERNAL_FORMAT_R32F);
    _wr_post_processing_effect_append_pass(gtaoEffect, finalBlend);

    // color texture for blending at the end
    _wr_post_processing_effect_connect(gtaoEffect, colorPassThrough, 0, finalBlend, 0);

    // downsampled textures for half-res AO
    if (halfRes) {
      _wr_post_processing_effect_connect(gtaoEffect, depthDownsamplePassThrough, 0, gtaoForwardPass, 0);
      _wr_post_processing_effect_connect(gtaoEffect, normalDownsamplePassThrough, 0, gtaoForwardPass, 1);
    }

    // denoising
    _wr_post_processing_effect_connect(gtaoEffect, gtaoForwardPass, 0, spatialDenoise, 0);
    _wr_post_processing_effect_connect(gtaoEffect, spatialDenoise, 0, temporalDenoise, 1);
    _wr_post_processing_effect_connect(gtaoEffect, temporalDenoise, 0, finalBlend, 1);

    // loopbacks for temporal
    _wr_post_processing_effect_connect(gtaoEffect, finalBlend, 1, temporalDenoise, 0);
    _wr_post_processing_effect_connect(gtaoEffect, finalBlend, 2, temporalDenoise, 2);

    _wr_post_processing_effect_set_result_program(gtaoEffect, WbWrenShaders.passThroughShader());

    return gtaoEffect;
  }

  static bloom(width, height, textureFormat) {
    let bloomEffect = _wr_post_processing_effect_new();
    _wr_post_processing_effect_set_drawing_index(bloomEffect, 5); //enum

    let colorPassThrough =_wr_post_processing_effect_pass_new();
    Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [colorPassThrough, "colorPassThrough"]);
   _wr_post_processing_effect_pass_set_program(colorPassThrough, WbWrenShaders.passThroughShader());
   _wr_post_processing_effect_pass_set_output_size(colorPassThrough, width, height);
   _wr_post_processing_effect_pass_set_alpha_blending(colorPassThrough, false);
   _wr_post_processing_effect_pass_set_input_texture_count(colorPassThrough, 1);
   _wr_post_processing_effect_pass_set_output_texture_count(colorPassThrough, 1);
   _wr_post_processing_effect_pass_set_output_texture_format(colorPassThrough, 0, textureFormat);
   _wr_post_processing_effect_append_pass(bloomEffect, colorPassThrough);

    let brightPass =_wr_post_processing_effect_pass_new();
    Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [brightPass, "brightPassFilter"]);
   _wr_post_processing_effect_pass_set_program(brightPass, WbWrenShaders.brightPassShader());
   _wr_post_processing_effect_pass_set_output_size(brightPass, width, height);
   _wr_post_processing_effect_pass_set_alpha_blending(brightPass, false);
   _wr_post_processing_effect_pass_set_input_texture_count(brightPass, 1);
   _wr_post_processing_effect_pass_set_output_texture_count(brightPass, 1);
   _wr_post_processing_effect_pass_set_input_texture_wrap_mode(brightPass, 0, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
   _wr_post_processing_effect_pass_set_output_texture_format(brightPass, 0, textureFormat);
   _wr_post_processing_effect_append_pass(bloomEffect, brightPass);

    let blurPasses = [];
    let downsamplePasses = [];

    for (let i = 0; i < 6; ++i) {
      let blurPass =_wr_post_processing_effect_pass_new();
      Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [blurPass, "blurPass" + i]);
     _wr_post_processing_effect_pass_set_program(blurPass, WbWrenShaders.gaussianBlur13TapShader());
     _wr_post_processing_effect_pass_set_output_size(blurPass, width / (1 << i), height / (1 << i));
     _wr_post_processing_effect_pass_set_input_texture_count(blurPass, 2);
     _wr_post_processing_effect_pass_set_alpha_blending(blurPass, false);
     _wr_post_processing_effect_pass_set_input_texture_interpolation(blurPass, 0, true);
     _wr_post_processing_effect_pass_set_input_texture_interpolation(blurPass, 1, true);
     _wr_post_processing_effect_pass_set_input_texture_wrap_mode(blurPass, 0,0x812F);
     _wr_post_processing_effect_pass_set_input_texture_wrap_mode(blurPass, 1, 0x812F);
     _wr_post_processing_effect_pass_set_output_texture_count(blurPass, 1);
     _wr_post_processing_effect_pass_set_output_texture_format(blurPass, 0, textureFormat);
     _wr_post_processing_effect_pass_set_iteration_count(blurPass, 2);
     _wr_post_processing_effect_append_pass(bloomEffect, blurPass);
      blurPasses[i] = blurPass;

      let downsamplePass =_wr_post_processing_effect_pass_new();
      Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [downsamplePass, "downsamplePass" + i]);
     _wr_post_processing_effect_pass_set_program(downsamplePass, WbWrenShaders.passThroughShader());
     _wr_post_processing_effect_pass_set_output_size(downsamplePass, width / (2 << i), height / (2 << i));
     _wr_post_processing_effect_pass_set_input_texture_count(downsamplePass, 1);
     _wr_post_processing_effect_pass_set_alpha_blending(downsamplePass, false);
     _wr_post_processing_effect_pass_set_input_texture_interpolation(downsamplePass, 0, true);
     _wr_post_processing_effect_pass_set_input_texture_wrap_mode(downsamplePass, 0, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
     _wr_post_processing_effect_pass_set_output_texture_count(downsamplePass, 1);
     _wr_post_processing_effect_pass_set_output_texture_format(downsamplePass, 0, textureFormat);
     _wr_post_processing_effect_append_pass(bloomEffect, downsamplePass);
      downsamplePasses[i] = downsamplePass;
    }

    let blendPass =_wr_post_processing_effect_pass_new();
    Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [blendPass, "blendBloom"]);
   _wr_post_processing_effect_pass_set_alpha_blending(blendPass, false);
   _wr_post_processing_effect_pass_set_program(blendPass, WbWrenShaders.bloomBlendShader());
   _wr_post_processing_effect_pass_set_output_size(blendPass, width, height);
   _wr_post_processing_effect_pass_set_input_texture_count(blendPass, 7);

    for (let i = 0; i < 7; ++i)
     _wr_post_processing_effect_pass_set_input_texture_wrap_mode(blendPass, i, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);

   _wr_post_processing_effect_pass_set_output_texture_count(blendPass, 1);
   _wr_post_processing_effect_pass_set_output_texture_format(blendPass, 0, textureFormat);
   _wr_post_processing_effect_append_pass(bloomEffect, blendPass);

   _wr_post_processing_effect_connect(bloomEffect, colorPassThrough, 0, blendPass, 0);
   _wr_post_processing_effect_connect(bloomEffect, brightPass, 0, blurPasses[0], 0);
   for (let i = 0; i < 5; ++i) {
     _wr_post_processing_effect_connect(bloomEffect, blurPasses[i], 0, downsamplePasses[i], 0);
     _wr_post_processing_effect_connect(bloomEffect, blurPasses[i], 0, blurPasses[i], 1);
     _wr_post_processing_effect_connect(bloomEffect, downsamplePasses[i], 0, blurPasses[i + 1], 0);
     _wr_post_processing_effect_connect(bloomEffect, blurPasses[i], 0, blendPass, i + 1);
   }

   _wr_post_processing_effect_set_result_program(bloomEffect, WbWrenShaders.passThroughShader());
    return bloomEffect;
  }

  static smaa(width, height, textureFormat) {
    let smaaEffect = _wr_post_processing_effect_new();
    _wr_post_processing_effect_set_drawing_index(smaaEffect, 13);

    let passThrough = _wr_post_processing_effect_pass_new();
    Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [passThrough, "LensFlarePassToBlend"]);
    _wr_post_processing_effect_pass_set_program(passThrough, WbWrenShaders.passThroughShader());
    _wr_post_processing_effect_pass_set_output_size(passThrough, width, height);
    _wr_post_processing_effect_pass_set_input_texture_count(passThrough, 1);
    _wr_post_processing_effect_pass_set_alpha_blending(passThrough, false);
    _wr_post_processing_effect_pass_set_output_texture_count(passThrough, 1);
    _wr_post_processing_effect_pass_set_output_texture_format(passThrough, 0, ENUM.WR_TEXTURE_INTERNAL_FORMAT_RGBA8);
    _wr_post_processing_effect_append_pass(smaaEffect, passThrough);

    let edgeDetection = _wr_post_processing_effect_pass_new();
    Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [edgeDetection, "EdgeDetect"]);
    _wr_post_processing_effect_pass_set_program(edgeDetection, WbWrenShaders.smaaEdgeDetectionShader());
    _wr_post_processing_effect_pass_set_output_size(edgeDetection, width, height);
    _wr_post_processing_effect_pass_set_input_texture_count(edgeDetection, 1);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(edgeDetection, 0, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_clear_before_draw(edgeDetection, true);
    _wr_post_processing_effect_pass_set_output_texture_count(edgeDetection, 1);
    _wr_post_processing_effect_pass_set_output_texture_format(edgeDetection, 0, ENUM.WR_TEXTURE_INTERNAL_FORMAT_RG8);
    _wr_post_processing_effect_append_pass(smaaEffect, edgeDetection);

    let weightCalculation = _wr_post_processing_effect_pass_new();
    Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [weightCalculation, "WeightCalculation"]);
    _wr_post_processing_effect_pass_set_program(weightCalculation, WbWrenShaders.smaaBlendingWeightCalculationShader());
    _wr_post_processing_effect_pass_set_output_size(weightCalculation, width, height);
    _wr_post_processing_effect_pass_set_input_texture_count(weightCalculation, 3);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(weightCalculation, 0, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(weightCalculation, 1, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(weightCalculation, 2, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture(weightCalculation, 1, WbWrenPostProcessingEffects.smaaAreaTexture);
    _wr_post_processing_effect_pass_set_input_texture(weightCalculation, 2, WbWrenPostProcessingEffects.smaaSearchTexture);
    _wr_post_processing_effect_pass_set_input_texture_interpolation(weightCalculation, 2, false);
    _wr_post_processing_effect_pass_set_clear_before_draw(weightCalculation, true);
    _wr_post_processing_effect_pass_set_alpha_blending(weightCalculation, false);
    _wr_post_processing_effect_pass_set_output_texture_count(weightCalculation, 1);
    _wr_post_processing_effect_pass_set_output_texture_format(weightCalculation, 0, ENUM.WR_TEXTURE_INTERNAL_FORMAT_RGBA8);
    _wr_post_processing_effect_append_pass(smaaEffect, weightCalculation);

    let finalBlend = _wr_post_processing_effect_pass_new();
    Module.ccall('wr_post_processing_effect_pass_set_name', null, ['number', 'string'], [finalBlend, "FinalBlend"]);
    _wr_post_processing_effect_pass_set_program(finalBlend, WbWrenShaders.smaaFinalBlendShader());
    _wr_post_processing_effect_pass_set_output_size(finalBlend, width, height);
    _wr_post_processing_effect_pass_set_alpha_blending(finalBlend, false);
    _wr_post_processing_effect_pass_set_input_texture_count(finalBlend, 2);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(finalBlend, 0, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_input_texture_wrap_mode(finalBlend, 1, ENUM.WR_TEXTURE_WRAP_MODE_CLAMP_TO_EDGE);
    _wr_post_processing_effect_pass_set_output_texture_count(finalBlend, 1);
    _wr_post_processing_effect_pass_set_output_texture_format(finalBlend, 0, ENUM.WR_TEXTURE_INTERNAL_FORMAT_RGB8);
    _wr_post_processing_effect_append_pass(smaaEffect, finalBlend);

    _wr_post_processing_effect_connect(smaaEffect, passThrough, 0, finalBlend, 0);
    _wr_post_processing_effect_connect(smaaEffect, edgeDetection, 0, weightCalculation, 0);
    _wr_post_processing_effect_connect(smaaEffect, weightCalculation, 0, finalBlend, 1);

    _wr_post_processing_effect_set_result_program(smaaEffect, WbWrenShaders.passThroughShader());

    return smaaEffect;
  }
}

//WbWrenPostProcessingEffects static variable
WbWrenPostProcessingEffects.lensFlareLenTexture = null;
WbWrenPostProcessingEffects.smaaAreaTexture = null;
WbWrenPostProcessingEffects.smaaSearchTexture = null;
WbWrenPostProcessingEffects.gtaoNoiseTexture = null;

export {WbWrenPostProcessingEffects}
