# Coding: utf-8
Encoding.default_external = Encoding::UTF_8
# adapted from  http://github.com/appden/appden.github.com/blob/master/Rakefile
require 'rubygems'
require 'packr'
require 'rake/clean'

desc 'Build site with Jekyll'
task :build => [:clean, :minify] do
  # compile site
  jekyll('build')
end
 
desc 'Start server with --watch'
task :server => [:clean, :minify]  do
  jekyll('serve --watch --incremental')
end

desc 'Minify JavaScript'
task :minify do
  # minify javascript
  source = File.read('assets/themes/default/js/site.js')
  minified = Packr.pack(source, :shrink_vars => true, :base62 => false)
  header = /\/\*.*?\*\//m.match(source)
  
  # inject header into minified javascript
  File.open('assets/themes/default/js/site.min.js', 'w') do |combined|
    combined.puts(header)
    combined.write(minified)  
  end  
end

task :default => :server

# clean deletes built copies
CLEAN.include(['_site/','assets/themes/default/js/*.min.js'])

def jekyll(opts = '')
  sh 'bundle exec jekyll ' + opts
end

